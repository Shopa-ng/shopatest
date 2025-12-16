import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { CreateDisputeDto, ResolveDisputeDto } from './dto';
import { DisputeStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class DisputesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDto: CreateDisputeDto) {
    const { orderId, reason, description } = createDto;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { vendor: { select: { userId: true } } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if user is buyer or vendor
    if (order.buyerId !== userId && order.vendor.userId !== userId) {
      throw new ForbiddenException(
        'You cannot create a dispute for this order',
      );
    }

    // Check if order is in a valid state for dispute
    const validStatuses: OrderStatus[] = [
      OrderStatus.PAID,
      OrderStatus.CONFIRMED,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
    ];
    if (!validStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Cannot create dispute for this order status',
      );
    }

    // Check if dispute already exists
    const existingDispute = await this.prisma.dispute.findFirst({
      where: {
        orderId,
        status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] },
      },
    });

    if (existingDispute) {
      throw new BadRequestException(
        'An active dispute already exists for this order',
      );
    }

    return this.prisma.dispute.create({
      data: {
        orderId,
        raisedById: userId,
        reason,
        description,
      },
      include: {
        order: { select: { orderNumber: true } },
        raisedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.dispute.findMany({
      where: { raisedById: userId },
      include: {
        order: { select: { orderNumber: true, totalAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(status?: DisputeStatus) {
    return this.prisma.dispute.findMany({
      where: status ? { status } : undefined,
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
            buyer: { select: { firstName: true, lastName: true } },
            vendor: { select: { storeName: true } },
          },
        },
        raisedBy: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            orderItems: {
              include: { product: { select: { name: true, images: true } } },
            },
            buyer: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            vendor: {
              select: {
                storeName: true,
                user: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
            },
            payment: { select: { status: true, amount: true } },
          },
        },
        raisedBy: { select: { firstName: true, lastName: true, email: true } },
        resolvedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    return dispute;
  }

  async resolve(id: string, adminId: string, resolveDto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (
      dispute.status === DisputeStatus.RESOLVED ||
      dispute.status === DisputeStatus.CLOSED
    ) {
      throw new BadRequestException('Dispute is already resolved or closed');
    }

    return this.prisma.dispute.update({
      where: { id },
      data: {
        status: resolveDto.status,
        resolution: resolveDto.resolution,
        resolvedById: adminId,
      },
    });
  }
}
