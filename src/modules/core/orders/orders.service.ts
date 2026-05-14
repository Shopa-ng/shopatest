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
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        deliveryAddress: true,
        deliveryMethod: true,
        notes: true,
        expectedDelivery: true,
        createdAt: true,
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
          include: { product: { select: { name: true, images: true, price: true, saleType: true } } },
        },
        buyer: { select: { firstName: true, lastName: true, phone: true } },
        payment: { select: { status: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map(({ deliveryMethod, deliveryAddress, orderItems, ...order }) => {
      const isPickup = deliveryMethod?.toUpperCase() === 'PICKUP';
      return {
        ...order,
        orderItems,
        saleType: orderItems[0]?.product?.saleType ?? null,
        deliveryType: isPickup ? 'PICKUP' : 'DELIVERY',
        pickupLocation: isPickup ? deliveryAddress : null,
        deliveryAddress: isPickup ? null : deliveryAddress,
      };
    });
  }

  async findById(id: string, userId: string, role?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: { product: { select: { name: true, images: true, price: true } } },
        },
        buyer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        vendor: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                campus: { select: { name: true } },
              },
            },
          },
        },
        payment: true,
        disputes: { select: { id: true, status: true, reason: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (role !== 'SUPER_ADMIN') {
      const isOwner = order.buyerId === userId || order.vendor.userId === userId;
      if (!isOwner) throw new ForbiddenException('Access denied');
    }

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
      .sendToUser(order.vendor.userId, {
        title: 'New Order Received!',
        body: `You have a new order #${order.orderNumber}. Log in to accept or decline.`,
      })
      .catch(() => null);

    return order;
  }

  async acceptOrder(id: string, userId: string, expectedDelivery?: string) {
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
      data: {
        status: OrderStatus.CONFIRMED,
        ...(expectedDelivery && { expectedDelivery: new Date(expectedDelivery) }),
      },
    });

    // Confirmation email to buyer
    const isPickup = order.deliveryMethod?.toUpperCase() === 'PICKUP';
    const deliveryDate = expectedDelivery ? new Date(expectedDelivery) : (() => { const d = new Date(); d.setDate(d.getDate() + 2); return d; })();
    const deliveryDateStr = deliveryDate.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' });
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

    // Push: order confirmed
    this.pushService
      .sendToUser(order.buyerId, {
        title: 'Order Confirmed!',
        body: `Your order #${order.orderNumber} from ${order.vendor.storeName} has been accepted. Expected delivery: ${deliveryDateStr}.`,
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

    // Push: order declined
    this.pushService
      .sendToUser(order.buyerId, {
        title: 'Order Declined',
        body: `Your order #${order.orderNumber} was declined. Email shopanigeria@gmail.com for a refund.`,
      })
      .catch(() => null);

    return updated;
  }

  async updateStatus(id: string, userId: string, updateDto: UpdateOrderStatusDto) {
    const order = await this.getVendorOrder(id, userId);

    const allowedTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED],
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({ where: { id }, data });

      if (updateDto.status === OrderStatus.DELIVERED) {
        // Deduct stock per item
        for (const item of order.orderItems) {
          const product = await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
          if (product.stock <= 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: { isActive: false, stock: 0 },
            });
          }
        }

        // Credit vendor: order amount minus 7.5% platform fee
        const vendorEarnings = parseFloat(order.totalAmount.toString()) * 0.925;
        await tx.vendor.update({
          where: { id: order.vendorId },
          data: {
            availableBalance: { increment: vendorEarnings },
            totalSales: { increment: 1 },
          },
        });
      }

      return updatedOrder;
    });

    // Push and email — titles/bodies scoped to DELIVERED; other transitions use generic
    if (updateDto.status === OrderStatus.DELIVERED) {
      this.pushService
        .sendToUser(order.buyerId, {
          title: 'Order Delivered!',
          body: `Your order #${order.orderNumber} has been marked as delivered. Please confirm receipt.`,
        })
        .catch(() => null);
    } else {
      this.pushService
        .notifyOrderStatusChange(order.buyerId, order.orderNumber, updateDto.status)
        .catch(() => null);
    }

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
        orderItems: { select: { productId: true, quantity: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.vendorId !== vendor.id) throw new ForbiddenException('Access denied');

    return order;
  }
} 