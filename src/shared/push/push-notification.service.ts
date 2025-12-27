import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../prisma';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class PushNotificationService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationService.name);
  private firebaseApp: admin.app.App | null = null;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('firebase.projectId');
    const privateKey = this.configService.get<string>('firebase.privateKey');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');

    if (projectId && privateKey && clientEmail) {
      try {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey,
            clientEmail,
          }),
        });
        this.logger.log('Firebase Admin SDK initialized');
      } catch (error) {
        this.logger.error('Failed to initialize Firebase Admin SDK:', error);
      }
    } else {
      this.logger.warn(
        'Firebase credentials not configured - push notifications disabled',
      );
    }
  }

  async sendToUser(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    if (!this.firebaseApp) {
      this.logger.warn(
        'Firebase not initialized - cannot send push notification',
      );
      return false;
    }

    // Get user's FCM token from User model
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user?.fcmToken) {
      this.logger.debug(`No FCM token found for user ${userId}`);
      return false;
    }

    return this.sendToToken(user.fcmToken, payload);
  }

  async sendToToken(
    token: string,
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    if (!this.firebaseApp) {
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'shopa_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Push sent: ${response}`);
      return true;
    } catch (error: any) {
      this.logger.error('Failed to send push notification:', error);

      // Clear invalid token
      if (error?.code === 'messaging/registration-token-not-registered') {
        await this.prisma.user.updateMany({
          where: { fcmToken: token },
          data: { fcmToken: null },
        });
        this.logger.log('Removed invalid FCM token from user');
      }

      return false;
    }
  }

  // Convenience methods for common notifications
  async notifyOrderStatusChange(
    userId: string,
    orderNumber: string,
    status: string,
  ): Promise<boolean> {
    const statusMessages: Record<string, string> = {
      CONFIRMED: 'Your order has been confirmed by the vendor',
      SHIPPED: 'Your order is on its way!',
      DELIVERED: 'Your order has been delivered',
      COMPLETED: 'Order completed successfully',
      CANCELLED: 'Your order has been cancelled',
    };

    return this.sendToUser(userId, {
      title: `Order ${orderNumber}`,
      body: statusMessages[status] || `Order status updated to ${status}`,
      data: { type: 'ORDER_UPDATE', orderId: orderNumber },
    });
  }

  async notifyNewMessage(
    userId: string,
    senderName: string,
    preview: string,
  ): Promise<boolean> {
    return this.sendToUser(userId, {
      title: `New message from ${senderName}`,
      body: preview.length > 50 ? preview.substring(0, 50) + '...' : preview,
      data: { type: 'NEW_MESSAGE' },
    });
  }

  async notifyNewOrder(
    vendorUserId: string,
    orderNumber: string,
  ): Promise<boolean> {
    return this.sendToUser(vendorUserId, {
      title: 'New Order Received! 🎉',
      body: `Order ${orderNumber} has been placed`,
      data: { type: 'NEW_ORDER', orderId: orderNumber },
    });
  }

  async notifyDisputeUpdate(userId: string, status: string): Promise<boolean> {
    return this.sendToUser(userId, {
      title: 'Dispute Update',
      body: `Your dispute status has been updated to ${status}`,
      data: { type: 'DISPUTE_UPDATE' },
    });
  }

  async notifyPaymentReceived(
    vendorUserId: string,
    amount: number,
  ): Promise<boolean> {
    return this.sendToUser(vendorUserId, {
      title: 'Payment Received',
      body: `₦${amount.toLocaleString()} has been released to your account`,
      data: { type: 'PAYMENT_RECEIVED' },
    });
  }
}
