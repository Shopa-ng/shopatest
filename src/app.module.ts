import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './prisma';
import { AllExceptionsFilter } from './common/filters';
import { AuthModule } from './modules/auth';
import { UsersModule } from './modules/users';
import { CampusModule } from './modules/campus';
import { VendorsModule } from './modules/vendors';
import { ProductsModule } from './modules/products';
import { OrdersModule } from './modules/orders';
import { PaymentsModule } from './modules/payments';
import { DisputesModule } from './modules/disputes';
import { ReviewsModule } from './modules/reviews';
import { NotificationsModule } from './modules/notifications';
import { MessagingModule } from './modules/messaging';
import { UploadModule } from './shared/upload';
import { CategoriesModule } from './modules/categories';
import { AnalyticsModule } from './shared/analytics';
import { EmailModule } from './shared/email';

import {
  appConfig,
  jwtConfig,
  paystackConfig,
  flutterwaveConfig,
  cloudinaryConfig,
  mailConfig,
} from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        jwtConfig,
        paystackConfig,
        flutterwaveConfig,
        cloudinaryConfig,
        mailConfig,
      ],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CampusModule,
    VendorsModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    DisputesModule,
    ReviewsModule,
    NotificationsModule,
    MessagingModule,
    UploadModule,
    CategoriesModule,
    AnalyticsModule,
    EmailModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
