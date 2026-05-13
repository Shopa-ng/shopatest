import { Module } from '@nestjs/common';
import { NotificationsModule } from '../modules/communication/notifications';
import { OrderExpiryTask } from './order-expiry.task';

@Module({
  imports: [NotificationsModule],
  providers: [OrderExpiryTask],
})
export class TasksModule {}
