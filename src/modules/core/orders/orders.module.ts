import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { EmailModule } from '../../communication/email';
import { PrismaModule } from '../../../prisma';
import { PushNotificationModule } from '../../communication/push';
import { PaymentsModule } from '../../finance/payments';

@Module({
  imports: [EmailModule, PrismaModule, PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {} 