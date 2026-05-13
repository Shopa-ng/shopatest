import { Module } from '@nestjs/common';
import { OrderExpiryTask } from './order-expiry.task';

@Module({
  providers: [OrderExpiryTask],
})
export class TasksModule {}
