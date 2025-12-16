import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';

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

import {
  appConfig,
  jwtConfig,
  paystackConfig,
  flutterwaveConfig,
  cloudinaryConfig,
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
      ],
    }),
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
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
