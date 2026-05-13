import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma';

@Injectable()
export class NotificationExpiryTask {
  private readonly logger = new Logger(NotificationExpiryTask.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async autoMarkNotificationsRead() {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const result = await this.prisma.notification.updateMany({
      where: { isRead: false, createdAt: { lte: cutoff } },
      data: { isRead: true },
    });
    this.logger.log(`[NotificationExpiryTask] Marked ${result.count} stale notification(s) as read`);
  }
}
