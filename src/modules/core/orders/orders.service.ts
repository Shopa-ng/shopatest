import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(buyerId: string, createDto: CreateOrderDto) {
    const { items, deliveryAddress, deliveryMethod, notes } = createDto;

    // Validate products and calculate total
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { vendor: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'One or more products not found or inactive',
      );
    }

    // Check all products are from the same vendor
    const vendorIds = [...new Set(products.map((p) => p.vendorId))];
    if (vendorIds.length > 1) {
      throw new BadRequestException(
        'All products must be from the same vendor',
      );
    }

    // Calculate total
    let totalAmount = new Prisma.Decimal(0);
    const orderItemsData = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const itemTotal = product.price.mul(item.quantity);
      totalAmount = totalAmount.add(itemTotal);

      return {
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      };
    });

    // Create order with items
    return this.prisma.order.create({
      data: {
        buyerId,
        vendorId: vendorIds[0],
        totalAmount,
        deliveryAddress,
        deliveryMethod,
        notes,
        orderItems: {
          create: orderItemsData,
        },
      },
      include: {
        orderItems: {
          include: { product: { select: { name: true, images: true } } },
        },
        vendor: { select: { storeName: true } },
      },
    });
  }

  async findByBuyer(buyerId: string) {
    return this.prisma.order.findMany({
      where: { buyerId },
      include: {
        orderItems: {
          include: { product: { select: { name: true, images: true } } },
        },
        vendor: { select: { storeName: true } },
        payment: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByVendor(vendorUserId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: vendorUserId },
    });

    if (!vendor) {
      throw new ForbiddenException('Vendor profile not found');
    }

    return this.prisma.order.findMany({
      where: { vendorId: vendor.id },
      include: {
        orderItems: {
          include: { product: { select: { name: true } } },
        },
        buyer: { select: { firstName: true, lastName: true } },
        payment: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: { product: true },
        },
        buyer: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        vendor: {
          select: {
            id: true,
            storeName: true,
            userId: true,
            user: { select: { firstName: true, phone: true } },
          },
        },
        payment: true,
        disputes: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if user is buyer or vendor
    if (order.buyerId !== userId && order.vendor.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
  }

  async updateStatus(
    id: string,
    userId: string,
    updateDto: UpdateOrderStatusDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { vendor: { select: { userId: true } } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only vendor can update status (except CANCELLED by buyer)
    if (
      order.vendor.userId !== userId &&
      updateDto.status !== OrderStatus.CANCELLED
    ) {
      throw new ForbiddenException('Only the vendor can update order status');
    }

    // Validate status transitions
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: [OrderStatus.CANCELLED],
      PAID: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      CONFIRMED: [OrderStatus.SHIPPED],
      SHIPPED: [OrderStatus.DELIVERED],
      DELIVERED: [OrderStatus.COMPLETED],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!validTransitions[order.status].includes(updateDto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${updateDto.status}`,
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: updateDto.status },
    });
  }

  async confirmDelivery(id: string, buyerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Only the buyer can confirm delivery');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Order must be marked as delivered first');
    }

    // Update order to COMPLETED
    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.COMPLETED },
    });
  }
}
