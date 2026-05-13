import { Module } from '@nestjs/common';
import { NotificationsModule } from '../modules/communication/notifications';
import { OrderExpiryTask } from './order-expiry.task';
import { DisputeExpiryTask } from './dispute-expiry.task';
import { NotificationExpiryTask } from './notification-expiry.task';

@Module({
  imports: [NotificationsModule],
  providers: [OrderExpiryTask, DisputeExpiryTask, NotificationExpiryTask],
})
export class TasksModule {}
