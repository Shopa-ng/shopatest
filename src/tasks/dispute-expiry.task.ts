import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DisputeStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import { EmailService } from '../modules/communication/email';
import { NotificationsService } from '../modules/communication/notifications';
import { PushNotificationService } from '../modules/communication/push';

@Injectable()
export class DisputeExpiryTask {
  private readonly logger = new Logger(DisputeExpiryTask.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private pushService: PushNotificationService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async autoResolveExpiredDisputes() {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    this.logger.log(`[DisputeExpiryTask] Checking for OPEN disputes older than ${cutoff.toISOString()} with no vendor response`);

    const expiredDisputes = await this.prisma.dispute.findMany({
      where: {
        status: DisputeStatus.OPEN,
        createdAt: { lte: cutoff },
        resolution: null, // vendor hasn't responded (responses stored as "Vendor response: ...")
      },
      include: {
        order: {
          include: {
            buyer: { select: { id: true, email: true, firstName: true, lastName: true } },
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
        },
      },
    });

    this.logger.log(`[DisputeExpiryTask] Found ${expiredDisputes.length} expired dispute(s)`);

    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true, email: true },
    });

    for (const dispute of expiredDisputes) {
      try {
        const { order } = dispute;
        const { buyer, vendor } = order;
        const campusName = vendor.user.campus?.name ?? 'your campus';
        const campusId = vendor.user.campusId;
        const customerName = `${buyer.firstName} ${buyer.lastName}`;
        const totalAmount = Number(order.totalAmount).toLocaleString('en-NG');
        const orderNumber = order.orderNumber;

        // 1. Mark dispute RESOLVED and flag order for refund — idempotent by the OPEN filter
        await this.prisma.$transaction([
          this.prisma.dispute.update({
            where: { id: dispute.id },
            data: {
              status: DisputeStatus.RESOLVED,
              resolution: 'Auto-resolved: vendor did not respond within 48 hours.',
            },
          }),
          this.prisma.order.update({
            where: { id: order.id },
            data: { refundStatus: 'PENDING_REFUND' },
          }),
        ]);

        this.logger.log(`[DisputeExpiryTask] Auto-resolved dispute ${dispute.id} for order ${orderNumber}`);

        // 2. Email + push to customer
        this.emailService
          .sendEmail({
            to: buyer.email,
            subject: 'Your Shopa dispute has been resolved',
            template: 'order-status',
            context: {
              firstName: buyer.firstName,
              orderNumber,
              status: 'DISPUTE_RESOLVED',
              statusMessage:
                `Hi ${buyer.firstName}, your dispute on order #${orderNumber} was not responded to by the vendor within 48 hours and has been automatically resolved in your favour. ` +
                `Your refund will be processed within 48 hours. You will be notified once it has been processed.`,
            },
          })
          .catch((e) => this.logger.error(`[DisputeExpiryTask] Buyer email failed for ${orderNumber}: ${e?.message}`));

        this.pushService
          .sendToUser(buyer.id, {
            title: 'Dispute Resolved',
            body: `Your dispute on #${orderNumber} has been resolved. Refund coming within 48 hours.`,
          })
          .catch(() => null);

        // 3. Email + push to all super admins
        for (const sa of superAdmins) {
          this.emailService
            .sendEmail({
              to: sa.email,
              subject: 'Auto-resolved dispute — refund required',
              template: 'order-status',
              context: {
                firstName: 'Admin',
                orderNumber,
                status: 'REFUND_REQUIRED',
                statusMessage:
                  `Dispute on order #${orderNumber} (${campusName}) was auto-resolved after 48 hours with no vendor response. ` +
                  `Customer: ${customerName}. Amount: ₦${totalAmount}. ` +
                  `Please process refund to customer's account. ` +
                  `Review: https://sadmin.shopshopa.com.ng/superadmin/disputes`,
              },
            })
            .catch(() => null);

          this.pushService
            .sendToUser(sa.id, {
              title: 'Refund Required',
              body: `#${orderNumber} — ₦${totalAmount} — auto-resolved dispute`,
            })
            .catch(() => null);
        }

        // 4. In-app notification to campus admin
        if (campusId) {
          const campusAdmin = await this.prisma.user.findFirst({
            where: { campusId, role: 'ADMIN' },
            select: { id: true },
          });

          if (campusAdmin) {
            this.notificationsService
              .create(
                campusAdmin.id,
                'ORDER_UPDATE',
                'Dispute Auto-Resolved',
                `Dispute on order #${orderNumber} was auto-resolved after vendor did not respond within 48 hours. Marked as resolved.`,
                { orderId: order.id, orderNumber },
              )
              .catch(() => null);
          }
        }
      } catch (e) {
        this.logger.error(`[DisputeExpiryTask] Failed to process dispute ${dispute.id}: ${e?.message}`);
      }
    }

    this.logger.log(`[DisputeExpiryTask] Done`);
  }
}
