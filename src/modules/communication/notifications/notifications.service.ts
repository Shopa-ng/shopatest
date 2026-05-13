import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from 'src/prisma';
import { PushNotificationService } from '../push';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushNotificationService,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, body, data },
    });

    // Fire push alongside in-app — never throws
    this.pushService
      .sendToUser(userId, { title, body })
      .catch((e) => this.logger.error(`Push failed for user ${userId}: ${e?.message}`));

    return notification;
  }

  async findByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async saveFcmToken(userId: string, fcmToken: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { fcmToken } });
    return { registered: true };
  }

  // kept for backwards compat with register-device endpoint
  async registerDevice(userId: string, fcmToken: string) {
    return this.saveFcmToken(userId, fcmToken);
  }

  async notifyOrderUpdate(buyerId: string, orderId: string, status: string) {
    return this.create(
      buyerId,
      NotificationType.ORDER_UPDATE,
      'Order Update',
      `Your order status has been updated to: ${status}`,
      { orderId, status },
    );
  }

  async notifyPaymentStatus(userId: string, orderId: string, paymentStatus: string) {
    return this.create(
      userId,
      NotificationType.PAYMENT_STATUS,
      'Payment Update',
      `Payment status: ${paymentStatus}`,
      { orderId, paymentStatus },
    );
  }

  async notifyDisputeUpdate(userId: string, disputeId: string, message: string) {
    return this.create(
      userId,
      NotificationType.DISPUTE_UPDATE,
      'Dispute Update',
      message,
      { disputeId },
    );
  }

  async notifyVendorVerified(userId: string, vendorId: string) {
    return this.create(
      userId,
      NotificationType.VENDOR_VERIFIED,
      'Vendor Verification',
      'Congratulations! Your vendor account has been verified.',
      { vendorId },
    );
  }
}
