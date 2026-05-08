import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma';
import { EmailService } from '../../communication/email';
import { PushNotificationService } from '../../communication/push';
import { PaymentsService } from '../../finance/payments';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private pushService: PushNotificationService,
    private paymentsService: PaymentsService,
  ) {}

  async findAll() {
    const orders = await this.prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        buyer: { select: { firstName: true, lastName: true, email: true } },
        vendor: {
          select: {
            storeName: true,
            user: { select: { campus: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: orders.map(({ vendor, totalAmount, ...order }) => ({
        ...order,
        total: Number(totalAmount),
        vendor: { storeName: vendor.storeName },
        campus: vendor.user?.campus ?? null,
      })),
    };
  }

  async findByBuyer(userId: string) {
    return this.prisma.order.findMany({
      where: { buyerId: userId },
      include: {
        orderItems: {
          include: { product: { select: { name: true, images: true, price: true } } },
        },
        vendor: { select: { storeName: true, logo: true } },
        payment: { select: { status: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByVendor(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenException('Vendor profile not found');

    const orders = await this.prisma.order.findMany({
      where: { vendorId: vendor.id },
      include: {
        orderItems: {
          include: { product: { select: { name: true, images: true, price: true } } },
        },
        buyer: { select: { firstName: true, lastName: true, phone: true } },
        payment: { select: { status: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map(({ deliveryMethod, deliveryAddress, ...order }) => {
      const isPickup = deliveryMethod?.toUpperCase() === 'PICKUP';
      return {
        ...order,
        deliveryType: isPickup ? 'PICKUP' : 'DELIVERY',
        pickupLocation: isPickup ? deliveryAddress : null,
        deliveryAddress: isPickup ? null : deliveryAddress,
      };
    });
  }

  async findById(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: { product: { select: { name: true, images: true, price: true } } },
        },
        buyer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        vendor: { select: { id: true, storeName: true, userId: true } },
        payment: true,
        disputes: { select: { id: true, status: true, reason: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const isOwner = order.buyerId === userId || order.vendor.userId === userId;
    if (!isOwner) throw new ForbiddenException('Access denied');

    return order;
  }

  async create(userId: string, createDto: CreateOrderDto) {
    const { items, deliveryAddress, deliveryMethod, notes } = createDto;

    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { vendor: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products are invalid or inactive');
    }

    const vendorIds = [...new Set(products.map((p) => p.vendorId))];
    if (vendorIds.length > 1) {
      throw new BadRequestException('All items in an order must belong to the same vendor');
    }

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)!;
      if (product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for product: ${product.name}`);
      }
    }

    const totalAmount = items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return sum + Number(product.price) * item.quantity;
    }, 0);

    const order = await this.prisma.order.create({
      data: {
        buyerId: userId,
        vendorId: vendorIds[0],
        totalAmount,
        deliveryAddress,
        deliveryMethod,
        notes,
        orderItems: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: products.find((p) => p.id === item.productId)!.price,
          })),
        },
      },
      include: {
        orderItems: {
          include: { product: { select: { name: true, price: true } } },
        },
        vendor: { select: { storeName: true, userId: true } },
      },
    });

    // Notify vendor of new order via push
    this.pushService
      .notifyNewOrder(order.vendor.userId, order.orderNumber)
      .catch(() => null);

    return order;
  }

  async acceptOrder(id: string, userId: string) {
    const order = await this.getVendorOrder(id, userId);

    if (order.status !== OrderStatus.PAID) {
      // Fallback: sync payment status from Paystack without triggering vendor email
      if (order.payment?.reference) {
        const synced = await this.paymentsService.syncPaymentStatus(order.payment.reference);
        if (!synced) throw new BadRequestException('Only paid orders can be accepted');
      } else {
        throw new BadRequestException('Only paid orders can be accepted');
      }
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CONFIRMED },
    });

    // Notify buyer via push
    this.pushService
      .notifyOrderStatusChange(order.buyerId, order.orderNumber, 'CONFIRMED')
      .catch(() => null);

    // Confirmation email to buyer
    const isPickup = order.deliveryMethod?.toUpperCase() === 'PICKUP';
    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() + 2);
    const deliveryDateStr = expectedDelivery.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' });
    const deliveryDetail = isPickup
      ? (order.notes ?? order.deliveryAddress ?? 'to be confirmed by vendor')
      : (order.deliveryAddress ?? order.notes ?? 'as provided');

    this.emailService
      .sendEmail({
        to: order.buyer.email,
        subject: 'Your Shopa order has been confirmed!',
        template: 'order-status',
        context: {
          firstName: order.buyer.firstName,
          orderNumber: order.orderNumber,
          storeName: order.vendor.storeName,
          status: 'CONFIRMED',
          statusMessage: `Hi ${order.buyer.firstName}, your order #${order.orderNumber} has been accepted by ${order.vendor.storeName}. Expected delivery: ${deliveryDateStr}. Delivery: ${deliveryDetail}. Total: ₦${Number(order.totalAmount).toLocaleString('en-NG')}. You will be notified once your order is delivered.`,
        },
      })
      .catch(() => null);

    return updated;
  }

  async rejectOrder(id: string, userId: string, reason: string) {
    const order = await this.getVendorOrder(id, userId);

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Order cannot be rejected at this stage');
    }

    const refundStatus = order.status === OrderStatus.PAID ? 'PENDING_REFUND' : null;

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        rejectionReason: reason,
        ...(refundStatus && { refundStatus }),
      },
    });

    // Notify buyer via push
    this.pushService
      .notifyOrderStatusChange(order.buyerId, order.orderNumber, 'CANCELLED')
      .catch(() => null);

    // Email buyer with decline notice and refund info
    this.emailService
      .sendEmail({
        to: order.buyer.email,
        subject: 'Your Shopa order was declined',
        template: 'order-status',
        context: {
          firstName: order.buyer.firstName,
          orderNumber: order.orderNumber,
          storeName: order.vendor.storeName,
          status: 'DECLINED',
          statusMessage: `Hi ${order.buyer.firstName}, unfortunately your order #${order.orderNumber} from ${order.vendor.storeName} was declined. Your payment will be refunded within 24-72 hours. If you have questions, please contact support.`,
        },
      })
      .catch(() => null);

    return updated;
  }

  async updateStatus(id: string, userId: string, updateDto: UpdateOrderStatusDto) {
    const order = await this.getVendorOrder(id, userId);

    const allowedTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.DELIVERED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    };

    const allowed = allowedTransitions[order.status];
    if (!allowed || !allowed.includes(updateDto.status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${updateDto.status}`,
      );
    }

    const data: any = { status: updateDto.status };

    // Set 24-hour dispute window when order is marked as DELIVERED
    if (updateDto.status === OrderStatus.DELIVERED) {
      const window = new Date();
      window.setHours(window.getHours() + 24);
      data.disputeWindowExpiresAt = window;
    }

    const updated = await this.prisma.order.update({ where: { id }, data });

    // Notify buyer of status change via push
    this.pushService
      .notifyOrderStatusChange(order.buyerId, order.orderNumber, updateDto.status)
      .catch(() => null);

    // Notify buyer via email
    this.emailService
      .sendOrderStatusUpdate(order.buyerId, order.orderNumber, updateDto.status)
      .catch(() => null);

    return updated;
  }

  async confirmDelivery(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { vendor: { select: { userId: true } } },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== userId) throw new ForbiddenException('Only the buyer can confirm delivery');
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Order has not been marked as delivered yet');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.COMPLETED },
    });

    // Notify vendor that payment will be released
    this.pushService
      .notifyPaymentReceived(order.vendor.userId, Number(order.totalAmount))
      .catch(() => null);

    return updated;
  }

  private async getVendorOrder(id: string, userId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenException('Vendor profile not found');

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        buyer: { select: { email: true, firstName: true, lastName: true } },
        payment: { select: { reference: true } },
        vendor: { select: { storeName: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.vendorId !== vendor.id) throw new ForbiddenException('Access denied');

    return order;
  }
} 