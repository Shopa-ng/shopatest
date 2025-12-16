import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data,
      },
    });

    // Send push notification if user has FCM token
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (user?.fcmToken) {
      await this.sendPushNotification(user.fcmToken, title, body, data);
    }

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
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

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

  async registerDevice(userId: string, fcmToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });

    return { registered: true };
  }

  private async sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    // Firebase Cloud Messaging implementation
    // This is a placeholder - actual implementation would use firebase-admin
    this.logger.log(`Sending push notification to ${fcmToken}: ${title}`);

    // In production, you would:
    // 1. Import firebase-admin
    // 2. Initialize with credentials
    // 3. Use messaging.send() to send the notification

    // Example:
    // await admin.messaging().send({
    //   token: fcmToken,
    //   notification: { title, body },
    //   data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
    // });
  }

  // Helper methods for sending specific notification types
  async notifyOrderUpdate(buyerId: string, orderId: string, status: string) {
    return this.create(
      buyerId,
      NotificationType.ORDER_UPDATE,
      'Order Update',
      `Your order status has been updated to: ${status}`,
      { orderId, status },
    );
  }

  async notifyPaymentStatus(
    userId: string,
    orderId: string,
    paymentStatus: string,
  ) {
    return this.create(
      userId,
      NotificationType.PAYMENT_STATUS,
      'Payment Update',
      `Payment status: ${paymentStatus}`,
      { orderId, paymentStatus },
    );
  }

  async notifyDisputeUpdate(
    userId: string,
    disputeId: string,
    message: string,
  ) {
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
