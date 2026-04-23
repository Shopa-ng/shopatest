import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.order.findMany({
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

    return this.prisma.order.create({
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
        vendor: { select: { storeName: true } },
      },
    });
  }

  async acceptOrder(id: string, userId: string) {
    const order = await this.getVendorOrder(id, userId);

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Only paid orders can be accepted');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CONFIRMED },
    });
  }

  async rejectOrder(id: string, userId: string, reason: string) {
    const order = await this.getVendorOrder(id, userId);

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Order cannot be rejected at this stage');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED, rejectionReason: reason },
    });
  }

  async updateStatus(id: string, userId: string, updateDto: UpdateOrderStatusDto) {
    const order = await this.getVendorOrder(id, userId);

    const allowedTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    };

    const allowed = allowedTransitions[order.status];
    if (!allowed || !allowed.includes(updateDto.status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${updateDto.status}`,
      );
    }

    const data: any = { status: updateDto.status };

    if (updateDto.status === OrderStatus.DELIVERED) {
      const window = new Date();
      window.setHours(window.getHours() + 24);
      data.disputeWindowExpiresAt = window;
    }

    return this.prisma.order.update({ where: { id }, data });
  }

  async confirmDelivery(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== userId) throw new ForbiddenException('Only the buyer can confirm delivery');
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Order has not been marked as delivered yet');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.COMPLETED },
    });
  }

  private async getVendorOrder(id: string, userId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenException('Vendor profile not found');

    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.vendorId !== vendor.id) throw new ForbiddenException('Access denied');

    return order;
  }
}
