import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

import { PrismaModule } from './prisma';
import { AllExceptionsFilter } from './common/filters';
import { LoggingInterceptor } from './common/interceptors';
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
import { PushNotificationModule } from './shared/push';

import {
  appConfig,
  jwtConfig,
  paystackConfig,
  flutterwaveConfig,
  cloudinaryConfig,
  mailConfig,
  redisConfig,
  firebaseConfig,
  loggingConfig,
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
        redisConfig,
        firebaseConfig,
        loggingConfig,
      ],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get<string>('redis.host'),
            port: configService.get<number>('redis.port'),
          },
          password: configService.get<string>('redis.password'),
          ttl: (configService.get<number>('redis.ttl') || 300) * 1000,
        }),
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
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
    PushNotificationModule,
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
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
