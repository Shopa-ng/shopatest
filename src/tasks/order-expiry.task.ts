import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import { EmailService } from '../modules/communication/email';
import { NotificationsService } from '../modules/communication/notifications';
import { PushNotificationService } from '../modules/communication/push';

@Injectable()
export class OrderExpiryTask {
  private readonly logger = new Logger(OrderExpiryTask.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private pushService: PushNotificationService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cancelExpiredOrders() {
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000);
    this.logger.log(`[OrderExpiryTask] Checking for PENDING orders older than ${cutoff.toISOString()}`);

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        createdAt: { lte: cutoff },
      },
      include: {
        buyer: { select: { id: true, email: true, firstName: true } },
        vendor: { select: { storeName: true } },
        orderItems: {
          include: { product: { select: { name: true } } },
        },
      },
    });

    this.logger.log(`[OrderExpiryTask] Found ${expiredOrders.length} expired order(s)`);

    for (const order of expiredOrders) {
      try {
        // Mark cancelled + flag for manual refund — single atomic update
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CANCELLED,
            refundStatus: 'PENDING_REFUND',
          },
        });

        this.logger.log(`[OrderExpiryTask] Cancelled order ${order.orderNumber}`);

        const storeName = order.vendor?.storeName ?? 'the vendor';

        // Email buyer
        this.emailService
          .sendEmail({
            to: order.buyer.email,
            subject: 'Your Shopa order was not fulfilled',
            template: 'order-status',
            context: {
              firstName: order.buyer.firstName,
              orderNumber: order.orderNumber,
              status: 'CANCELLED',
              statusMessage:
                `Hi ${order.buyer.firstName}, your order #${order.orderNumber} from ${storeName} was not accepted by the vendor within 72 hours and has been automatically cancelled.\n\n` +
                `To receive your refund, please send your bank account details to shopanigeria@gmail.com with the subject line "Refund Request - #${order.orderNumber}". ` +
                `Your refund will be processed within 48 hours of receiving your details.`,
            },
          })
          .catch((e) =>
            this.logger.error(`[OrderExpiryTask] Email failed for order ${order.orderNumber}: ${e?.message}`),
          );

        // In-app notification
        this.notificationsService
          .create(
            order.buyer.id,
            'ORDER_UPDATE',
            'Order Automatically Cancelled',
            `Your order #${order.orderNumber} was automatically cancelled. Please email shopanigeria@gmail.com with your account details for a refund within 48 hours.`,
            { orderId: order.id, orderNumber: order.orderNumber },
          )
          .catch((e) =>
            this.logger.error(`[OrderExpiryTask] Notification failed for order ${order.orderNumber}: ${e?.message}`),
          );

        // Push notification
        this.pushService
          .sendToUser(order.buyer.id, {
            title: 'Order Cancelled',
            body: `Your order #${order.orderNumber} was auto-cancelled. Email shopanigeria@gmail.com for a refund within 48 hours.`,
          })
          .catch(() => null);
      } catch (e) {
        this.logger.error(`[OrderExpiryTask] Failed to process order ${order.orderNumber}: ${e?.message}`);
      }
    }

    this.logger.log(`[OrderExpiryTask] Done`);
  }
}
