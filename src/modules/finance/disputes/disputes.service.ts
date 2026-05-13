import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma';
import { EmailService } from '../../communication/email';
import { PushNotificationService } from '../../communication/push';
import { CreateDisputeDto, ResolveDisputeDto } from './dto';
import { DisputeStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class DisputesService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private pushService: PushNotificationService,
  ) {}

  async create(userId: string, createDto: CreateDisputeDto) {
    const { orderId, reason, description, accountDetails, proofUrls } = createDto;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { firstName: true, lastName: true } },
        vendor: {
          include: {
            user: {
              include: {
                campus: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

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
      throw new BadRequestException('Cannot create dispute for this order status');
    }

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
      where: { orderId, status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
    });

    if (existingDispute) {
      throw new BadRequestException('An active dispute already exists for this order');
    }

    const dispute = await this.prisma.dispute.create({
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

    // Fire all three notifications after dispute is persisted — nothing throws back
    this.sendDisputeNotifications(
      {
        orderNumber: order.orderNumber,
        buyer: order.buyer,
        vendor: {
          storeName: order.vendor.storeName,
          campusId: order.vendor.user.campusId ?? '',
          user: order.vendor.user,
          campus: order.vendor.user.campus,
        },
      },
      reason,
    ).catch(() => null);

    return dispute;
  }

  private async sendDisputeNotifications(
    order: {
      orderNumber: string;
      buyer: { firstName: string; lastName: string };
      vendor: {
        storeName: string;
        campusId: string;
        user: { id: string; email: string; firstName: string };
        campus: { id: string; name: string } | null;
      };
    },
    reason: string,
  ) {
    const { orderNumber, buyer, vendor } = order;
    const campusName = vendor.campus?.name ?? 'your campus';
    const customerName = `${buyer.firstName} ${buyer.lastName}`;

    // 1. Vendor
    this.emailService
      .sendEmail({
        to: vendor.user.email,
        subject: 'A dispute has been raised on your order',
        template: 'order-status',
        context: {
          firstName: vendor.user.firstName,
          orderNumber,
          status: 'DISPUTE_RAISED',
          statusMessage:
            `Hi ${vendor.user.firstName}, a customer has raised a dispute on order #${orderNumber}. ` +
            `Reason: ${reason}. Log in to your dashboard to respond: https://vendor.shopshopa.com.ng/vendor/orders`,
        },
      })
      .catch(() => null);

    this.pushService
      .sendToUser(vendor.user.id, {
        title: 'New Dispute Raised',
        body: `Order #${orderNumber}: ${reason}`,
      })
      .catch(() => null);

    // 2. Campus admin (if one exists)
    const campusAdmin = vendor.campusId
      ? await this.prisma.user.findFirst({
          where: { campusId: vendor.campusId, role: 'ADMIN' },
          select: { id: true, email: true, firstName: true },
        })
      : null;

    if (campusAdmin) {
      this.emailService
        .sendEmail({
          to: campusAdmin.email,
          subject: 'New dispute on your campus',
          template: 'order-status',
          context: {
            firstName: campusAdmin.firstName,
            orderNumber,
            status: 'DISPUTE_RAISED',
            statusMessage:
              `Hi ${campusAdmin.firstName}, a dispute has been raised on order #${orderNumber} on ${campusName}. ` +
              `Customer: ${customerName}. Reason: ${reason}. ` +
              `Log in to review: https://uadmin.shopshopa.com.ng/admin/disputes`,
          },
        })
        .catch(() => null);

      this.pushService
        .sendToUser(campusAdmin.id, {
          title: 'New Campus Dispute',
          body: `#${orderNumber} — ${reason}`,
        })
        .catch(() => null);
    }

    // 3. All super admins
    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true, email: true },
    });

    for (const sa of superAdmins) {
      this.emailService
        .sendEmail({
          to: sa.email,
          subject: 'New dispute on Shopa',
          template: 'order-status',
          context: {
            firstName: 'Admin',
            orderNumber,
            status: 'DISPUTE_RAISED',
            statusMessage:
              `A dispute has been raised on order #${orderNumber} on ${campusName}. ` +
              `Customer: ${customerName}. Vendor: ${vendor.storeName}. Reason: ${reason}. ` +
              `Review: https://sadmin.shopshopa.com.ng/superadmin/disputes`,
          },
        })
        .catch(() => null);

      this.pushService
        .sendToUser(sa.id, {
          title: 'New Dispute',
          body: `#${orderNumber} — ${vendor.storeName} — ${reason}`,
        })
        .catch(() => null);
    }
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
    const vendor = await this.prisma.vendor.findUnique({ where: { userId: vendorUserId } });
    if (!vendor) throw new ForbiddenException('Vendor profile not found');

    return this.prisma.dispute.findMany({
      where: { order: { vendorId: vendor.id } },
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
            buyer: { select: { firstName: true, lastName: true, email: true, phone: true } },
            vendor: {
              select: {
                storeName: true,
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
            payment: { select: { status: true, amount: true } },
          },
        },
        raisedBy: { select: { firstName: true, lastName: true, email: true } },
        resolvedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!dispute) throw new NotFoundException('Dispute not found');
    return dispute;
  }

  async respondToDispute(id: string, vendorUserId: string, response: string, vendorProofUrls?: string[]) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId: vendorUserId } });
    if (!vendor) throw new ForbiddenException('Vendor profile not found');

    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: { order: { select: { vendorId: true } } },
    });

    if (!dispute) throw new NotFoundException('Dispute not found');

    if (dispute.order.vendorId !== vendor.id) {
      throw new ForbiddenException('You can only respond to disputes on your own orders');
    }

    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CLOSED) {
      throw new BadRequestException('Cannot respond to a resolved or closed dispute');
    }

    return this.prisma.dispute.update({
      where: { id },
      data: {
        status: DisputeStatus.UNDER_REVIEW,
        resolution: `Vendor response: ${response}`,
        ...(vendorProofUrls?.length && { vendorProofUrls }),
      },
    });
  }

  async resolve(id: string, adminId: string, resolveDto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });

    if (!dispute) throw new NotFoundException('Dispute not found');

    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CLOSED) {
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
