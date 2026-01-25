import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

import { PrismaModule } from './prisma';
import { AllExceptionsFilter } from './common/filters';
import { LoggingInterceptor } from './common/interceptors';

// Identity Domain
import { AuthModule } from './modules/identity/auth';
import { UsersModule } from './modules/identity/users';
import { VendorsModule } from './modules/identity/vendors';

// Core Domain
import { ProductsModule } from './modules/core/products';
import { CategoriesModule } from './modules/core/categories';
import { OrdersModule } from './modules/core/orders';
import { ReviewsModule } from './modules/core/reviews';
import { CampusModule } from './modules/core/campus';
import { MessagingModule } from './modules/core/messaging';

// Finance Domain
import { PaymentsModule } from './modules/finance/payments';
import { DisputesModule } from './modules/finance/disputes';

// Communication Domain
import { NotificationsModule } from './modules/communication/notifications';
import { EmailModule } from './modules/communication/email';
import { PushNotificationModule } from './modules/communication/push';

// Media Domain
import { UploadModule } from './modules/media/upload';

// Shared
import { AnalyticsModule } from './shared/analytics';

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

import * as Joi from 'joi';

// ... imports ...

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
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'provision')
          .default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().required(),
        SMTP_HOST: Joi.string().required(),
        SMTP_PORT: Joi.number().required(),
        SMTP_USER: Joi.string().required(),
        SMTP_PASS: Joi.string().required(),
        SMTP_SECURE: Joi.boolean().default(true),
        MAIL_FROM: Joi.string().required(),
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          username: configService.get<string>('redis.username'),
          password: configService.get<string>('redis.password'),
          socket: {
            host: configService.get<string>('redis.host'),
            port: configService.get<number>('redis.port'),
          },
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
    // Identity
    AuthModule,
    UsersModule,
    VendorsModule,
    // Core
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    ReviewsModule,
    CampusModule,
    MessagingModule,
    // Finance
    PaymentsModule,
    DisputesModule,
    // Communication
    NotificationsModule,
    EmailModule,
    PushNotificationModule,
    // Media
    UploadModule,
    // Shared
    AnalyticsModule,
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
