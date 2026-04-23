import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma';
import { CreateDisputeDto, ResolveDisputeDto } from './dto';
import { DisputeStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class DisputesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDto: CreateDisputeDto) {
    const { orderId, reason, description, accountDetails, proofUrls } =
      createDto;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { vendor: { select: { userId: true } } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only the buyer can raise a dispute
    if (order.buyerId !== userId) {
      throw new ForbiddenException('Only the buyer can raise a dispute');
    }

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

    // Enforce 24-hour dispute window for delivered orders
    if (
      order.status === OrderStatus.DELIVERED &&
      order.disputeWindowExpiresAt &&
      new Date() > order.disputeWindowExpiresAt
    ) {
      throw new BadRequestException(
        'The dispute window for this order has expired. Disputes must be raised within 24 hours of delivery.',
      );
    }

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
        accountDetails,
        proofUrls: proofUrls ?? [],
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

  async findByVendor(vendorUserId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: vendorUserId },
    });
    if (!vendor) throw new ForbiddenException('Vendor profile not found');

    return this.prisma.dispute.findMany({
      where: {
        order: { vendorId: vendor.id },
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
            buyer: { select: { firstName: true, lastName: true } },
          },
        },
        raisedBy: { select: { firstName: true, lastName: true } },
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
        raisedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
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

  async respondToDispute(id: string, vendorUserId: string, response: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: vendorUserId },
    });
    if (!vendor) throw new ForbiddenException('Vendor profile not found');

    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: { order: { select: { vendorId: true } } },
    });

    if (!dispute) throw new NotFoundException('Dispute not found');

    if (dispute.order.vendorId !== vendor.id) {
      throw new ForbiddenException(
        'You can only respond to disputes on your own orders',
      );
    }

    if (
      dispute.status === DisputeStatus.RESOLVED ||
      dispute.status === DisputeStatus.CLOSED
    ) {
      throw new BadRequestException(
        'Cannot respond to a resolved or closed dispute',
      );
    }

    // Store response in the resolution field temporarily
    // and update status to UNDER_REVIEW
    return this.prisma.dispute.update({
      where: { id },
      data: {
        status: DisputeStatus.UNDER_REVIEW,
        resolution: `Vendor response: ${response}`,
      },
    });
  }

  async resolve(id: string, adminId: string, resolveDto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });

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