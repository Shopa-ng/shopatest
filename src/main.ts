import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: [
      configService.get<string>('app.frontendUrl'),
      'http://localhost:8081',
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Shopa API')
    .setDescription(
      'Student-only mobile marketplace API for Nigerian universities',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Campus', 'Campus/University management')
    .addTag('Vendors', 'Vendor management endpoints')
    .addTag('Products', 'Product catalog endpoints')
    .addTag('Orders', 'Order management endpoints')
    .addTag('Payments', 'Payment and escrow endpoints')
    .addTag('Disputes', 'Dispute resolution endpoints')
    .addTag('Reviews', 'Ratings and reviews endpoints')
    .addTag('Notifications', 'Push notification endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('app.port') || 9000;
  await app.listen(port);

  console.log(`🚀 Shopa API is running on: http://localhost:${port}`);
  console.log(
    `📚 Swagger docs available at: http://localhost:${port}/api/docs`,
  );
}

bootstrap();
