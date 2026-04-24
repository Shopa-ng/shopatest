import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { EmailModule } from '../../communication/email';
import { PrismaModule } from '../../../prisma';
import { PushNotificationModule } from '../../communication/push';

@Module({
  imports: [EmailModule, PrismaModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {} 