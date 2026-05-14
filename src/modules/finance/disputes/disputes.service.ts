import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma';
import { EmailService } from '../../communication/email';
import { PushNotificationService } from '../../communication/push';
import { CreateDisputeDto, ResolveDisputeDto, DisputeOutcome } from './dto';
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
      include: {
        order: {
          include: {
            buyer: { select: { firstName: true, lastName: true } },
            vendor: {
              include: {
                user: {
                  include: { campus: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!dispute) throw new NotFoundException('Dispute not found');

    if (dispute.order.vendorId !== vendor.id) {
      throw new ForbiddenException('You can only respond to disputes on your own orders');
    }

    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CLOSED) {
      throw new BadRequestException('Cannot respond to a resolved or closed dispute');
    }

    const updated = await this.prisma.dispute.update({
      where: { id },
      data: {
        status: DisputeStatus.VENDOR_RESPONDED,
        resolution: `Vendor response: ${response}`,
        ...(vendorProofUrls?.length && { vendorProofUrls }),
      },
    });

    // Notify campus admin
    const campusId = dispute.order.vendor.user.campusId;
    const storeName = dispute.order.vendor.storeName;
    const orderNumber = dispute.order.orderNumber;
    const customerName = `${dispute.order.buyer.firstName} ${dispute.order.buyer.lastName}`;

    if (campusId) {
      const campusAdmin = await this.prisma.user.findFirst({
        where: { campusId, role: 'ADMIN' },
        select: { id: true, email: true, firstName: true },
      });

      if (campusAdmin) {
        this.emailService
          .sendEmail({
            to: campusAdmin.email,
            subject: 'Vendor has responded to a dispute',
            template: 'order-status',
            context: {
              firstName: campusAdmin.firstName,
              orderNumber,
              status: 'VENDOR_RESPONDED',
              statusMessage:
                `Hi ${campusAdmin.firstName}, the vendor ${storeName} has responded to dispute on order #${orderNumber}. ` +
                `Customer: ${customerName}. ` +
                `Please log in to review and resolve: https://uadmin.shopshopa.com.ng/admin/disputes/${id}`,
            },
          })
          .catch(() => null);

        this.pushService
          .sendToUser(campusAdmin.id, {
            title: 'Vendor Responded',
            body: `${storeName} responded to dispute #${orderNumber}. Review now.`,
          })
          .catch(() => null);
      }
    }

    return updated;
  }

  async resolve(id: string, adminId: string, resolveDto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            buyer: { select: { id: true, email: true, firstName: true, lastName: true } },
            vendor: {
              include: {
                user: { select: { id: true, email: true, firstName: true } },
              },
            },
          },
        },
      },
    });

    if (!dispute) throw new NotFoundException('Dispute not found');

    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CLOSED) {
      throw new BadRequestException('Dispute is already resolved or closed');
    }

    const { outcome, resolution } = resolveDto;
    const { order } = dispute;
    const { buyer, vendor } = order;
    const orderNumber = order.orderNumber;
    const totalAmount = Number(order.totalAmount).toLocaleString('en-NG');
    const customerName = `${buyer.firstName} ${buyer.lastName}`;
    const isRefund = outcome === DisputeOutcome.REFUND_REQUESTED;

    const vendorEarnings = Number(order.totalAmount) * 0.925;

    // Update dispute + order + vendor balance atomically
    await this.prisma.$transaction([
      this.prisma.dispute.update({
        where: { id },
        data: { status: DisputeStatus.RESOLVED, resolution, resolvedById: adminId },
      }),
      ...(isRefund
        ? [
            // Mark order for manual refund processing
            this.prisma.order.update({
              where: { id: order.id },
              data: { refundStatus: 'PENDING_REFUND' },
            }),
            // Deduct earned amount from vendor's available balance
            this.prisma.vendor.update({
              where: { id: order.vendorId },
              data: { availableBalance: { decrement: vendorEarnings } },
            }),
          ]
        : [
            // No refund — dispute window/lock is cleared by RESOLVED status,
            // withdrawableBalance computation already excludes RESOLVED disputes
            // Nothing extra needed; available balance was credited on DELIVERED
          ]),
    ]);

    if (isRefund) {
      // Email + push to buyer
      this.emailService
        .sendEmail({
          to: buyer.email,
          subject: `Your dispute on #${orderNumber} has been resolved`,
          template: 'order-status',
          context: {
            firstName: buyer.firstName,
            orderNumber,
            status: 'DISPUTE_RESOLVED',
            statusMessage:
              `Your dispute on order #${orderNumber} has been resolved in your favour. ` +
              `A refund will be processed within 48 hours. Reason: ${resolution}`,
          },
        })
        .catch(() => null);
      this.pushService
        .sendToUser(buyer.id, {
          title: 'Dispute Resolved — Refund Coming',
          body: `Your dispute on #${orderNumber} was resolved in your favour. Refund within 48 hours.`,
        })
        .catch(() => null);

      // Email + push to vendor
      this.emailService
        .sendEmail({
          to: vendor.user.email,
          subject: `Dispute resolved — order #${orderNumber}`,
          template: 'order-status',
          context: {
            firstName: vendor.user.firstName,
            orderNumber,
            status: 'DISPUTE_RESOLVED',
            statusMessage:
              `The dispute on order #${orderNumber} has been resolved. The customer will be refunded. ` +
              `Reason from admin: ${resolution}`,
          },
        })
        .catch(() => null);
      this.pushService
        .sendToUser(vendor.user.id, {
          title: 'Dispute Resolved',
          body: `Dispute on order #${orderNumber} resolved. Customer will be refunded.`,
        })
        .catch(() => null);

      // Email + push to all super admins
      const superAdmins = await this.prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { id: true, email: true },
      });
      for (const sa of superAdmins) {
        this.emailService
          .sendEmail({
            to: sa.email,
            subject: `Refund required for order #${orderNumber}`,
            template: 'order-status',
            context: {
              firstName: 'Admin',
              orderNumber,
              status: 'REFUND_REQUIRED',
              statusMessage:
                `Refund required for order #${orderNumber} — ₦${totalAmount}. Customer: ${customerName}. ` +
                `Resolve at: https://sadmin.shopshopa.com.ng/superadmin/disputes`,
            },
          })
          .catch(() => null);
        this.pushService
          .sendToUser(sa.id, {
            title: 'Refund Required',
            body: `#${orderNumber} — ₦${totalAmount} — refund required`,
          })
          .catch(() => null);
      }
    } else {
      // NO_REFUND — email + push to buyer and vendor only
      this.emailService
        .sendEmail({
          to: buyer.email,
          subject: `Update on your dispute — order #${orderNumber}`,
          template: 'order-status',
          context: {
            firstName: buyer.firstName,
            orderNumber,
            status: 'DISPUTE_CLOSED',
            statusMessage:
              `Your dispute on order #${orderNumber} has been reviewed. Decision: No refund. ` +
              `Reason: ${resolution}. If you have concerns, contact support.`,
          },
        })
        .catch(() => null);
      this.pushService
        .sendToUser(buyer.id, {
          title: 'Dispute Decision',
          body: `Your dispute on #${orderNumber} has been reviewed. No refund will be issued.`,
        })
        .catch(() => null);

      this.emailService
        .sendEmail({
          to: vendor.user.email,
          subject: `Dispute resolved — order #${orderNumber}`,
          template: 'order-status',
          context: {
            firstName: vendor.user.firstName,
            orderNumber,
            status: 'DISPUTE_CLOSED',
            statusMessage:
              `The dispute on order #${orderNumber} has been resolved. No refund will be issued. ` +
              `Reason: ${resolution}`,
          },
        })
        .catch(() => null);
      this.pushService
        .sendToUser(vendor.user.id, {
          title: 'Dispute Resolved',
          body: `Dispute on order #${orderNumber} resolved. No refund issued.`,
        })
        .catch(() => null);
    }

    return { resolved: true, outcome, orderId: order.id };
  }
}
