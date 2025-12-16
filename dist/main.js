"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    app.enableCors({
        origin: configService.get('app.frontendUrl'),
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.setGlobalPrefix('api/v1');
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('Shopa API')
        .setDescription('Student-only mobile marketplace API for Nigerian universities')
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
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = configService.get('app.port') || 9000;
    await app.listen(port);
    console.log(`🚀 Shopa API is running on: http://localhost:${port}`);
    console.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map