"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../prisma");
const client_1 = require("@prisma/client");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async create(userId, type, title, body, data) {
        const notification = await this.prisma.notification.create({
            data: {
                userId,
                type,
                title,
                body,
                data,
            },
        });
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { fcmToken: true },
        });
        if (user?.fcmToken) {
            await this.sendPushNotification(user.fcmToken, title, body, data);
        }
        return notification;
    }
    async findByUser(userId) {
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    async getUnreadCount(userId) {
        return this.prisma.notification.count({
            where: { userId, isRead: false },
        });
    }
    async markAsRead(id, userId) {
        const notification = await this.prisma.notification.findUnique({
            where: { id },
        });
        if (!notification || notification.userId !== userId) {
            throw new common_1.NotFoundException('Notification not found');
        }
        return this.prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
    }
    async markAllAsRead(userId) {
        await this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        return { success: true };
    }
    async registerDevice(userId, fcmToken) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { fcmToken },
        });
        return { registered: true };
    }
    async sendPushNotification(fcmToken, title, body, data) {
        this.logger.log(`Sending push notification to ${fcmToken}: ${title}`);
    }
    async notifyOrderUpdate(buyerId, orderId, status) {
        return this.create(buyerId, client_1.NotificationType.ORDER_UPDATE, 'Order Update', `Your order status has been updated to: ${status}`, { orderId, status });
    }
    async notifyPaymentStatus(userId, orderId, paymentStatus) {
        return this.create(userId, client_1.NotificationType.PAYMENT_STATUS, 'Payment Update', `Payment status: ${paymentStatus}`, { orderId, paymentStatus });
    }
    async notifyDisputeUpdate(userId, disputeId, message) {
        return this.create(userId, client_1.NotificationType.DISPUTE_UPDATE, 'Dispute Update', message, { disputeId });
    }
    async notifyVendorVerified(userId, vendorId) {
        return this.create(userId, client_1.NotificationType.VENDOR_VERIFIED, 'Vendor Verification', 'Congratulations! Your vendor account has been verified.', { vendorId });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map