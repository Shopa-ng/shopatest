"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const prisma_1 = require("./prisma");
const filters_1 = require("./common/filters");
const auth_1 = require("./modules/auth");
const users_1 = require("./modules/users");
const campus_1 = require("./modules/campus");
const vendors_1 = require("./modules/vendors");
const products_1 = require("./modules/products");
const orders_1 = require("./modules/orders");
const payments_1 = require("./modules/payments");
const disputes_1 = require("./modules/disputes");
const reviews_1 = require("./modules/reviews");
const notifications_1 = require("./modules/notifications");
const messaging_1 = require("./modules/messaging");
const upload_1 = require("./shared/upload");
const categories_1 = require("./modules/categories");
const config_2 = require("./config");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [
                    config_2.appConfig,
                    config_2.jwtConfig,
                    config_2.paystackConfig,
                    config_2.flutterwaveConfig,
                    config_2.cloudinaryConfig,
                ],
            }),
            prisma_1.PrismaModule,
            auth_1.AuthModule,
            users_1.UsersModule,
            campus_1.CampusModule,
            vendors_1.VendorsModule,
            products_1.ProductsModule,
            orders_1.OrdersModule,
            payments_1.PaymentsModule,
            disputes_1.DisputesModule,
            reviews_1.ReviewsModule,
            notifications_1.NotificationsModule,
            messaging_1.MessagingModule,
            upload_1.UploadModule,
            categories_1.CategoriesModule,
        ],
        providers: [
            {
                provide: core_1.APP_FILTER,
                useClass: filters_1.AllExceptionsFilter,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map