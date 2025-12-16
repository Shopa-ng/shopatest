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
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_1 = require("../../prisma");
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
const crypto = require("crypto");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        this.logger = new common_1.Logger(PaymentsService_1.name);
    }
    async initializePayment(userId, dto) {
        const { orderId } = dto;
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: { select: { email: true, firstName: true } },
                payment: true,
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.buyerId !== userId) {
            throw new common_1.ForbiddenException('You can only pay for your own orders');
        }
        if (order.status !== client_1.OrderStatus.PENDING) {
            throw new common_1.BadRequestException('Order is not in pending status');
        }
        if (order.payment) {
            throw new common_1.BadRequestException('Payment already exists for this order');
        }
        const reference = `SHOPA-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`;
        const payment = await this.prisma.payment.create({
            data: {
                orderId,
                amount: order.totalAmount,
                reference,
                provider: 'paystack',
                status: client_1.PaymentStatus.PENDING,
            },
        });
        const paystackSecretKey = this.configService.get('paystack.secretKey');
        const amountInKobo = order.totalAmount.mul(100).toNumber();
        try {
            const response = await fetch('https://api.paystack.co/transaction/initialize', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${paystackSecretKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: order.buyer.email,
                    amount: amountInKobo,
                    reference,
                    callback_url: `${this.configService.get('app.frontendUrl')}/payment/callback`,
                    metadata: {
                        orderId,
                        orderNumber: order.orderNumber,
                        buyerName: order.buyer.firstName,
                    },
                }),
            });
            const data = await response.json();
            if (!data.status) {
                throw new common_1.BadRequestException(data.message || 'Failed to initialize payment');
            }
            return {
                authorizationUrl: data.data.authorization_url,
                reference: data.data.reference,
                accessCode: data.data.access_code,
            };
        }
        catch (error) {
            this.logger.error('Paystack initialization error:', error);
            throw new common_1.BadRequestException('Failed to initialize payment');
        }
    }
    async handlePaystackWebhook(body, signature) {
        const secret = this.configService.get('paystack.secretKey');
        const hash = crypto
            .createHmac('sha512', secret)
            .update(JSON.stringify(body))
            .digest('hex');
        if (hash !== signature) {
            throw new common_1.ForbiddenException('Invalid signature');
        }
        const { event, data } = body;
        if (event === 'charge.success') {
            await this.handleSuccessfulPayment(data.reference);
        }
        return { received: true };
    }
    async handleSuccessfulPayment(reference) {
        const payment = await this.prisma.payment.findUnique({
            where: { reference },
            include: { order: true },
        });
        if (!payment) {
            this.logger.warn(`Payment not found for reference: ${reference}`);
            return;
        }
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: client_1.PaymentStatus.HELD,
                escrowReleaseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        await this.prisma.order.update({
            where: { id: payment.orderId },
            data: { status: client_1.OrderStatus.PAID },
        });
        this.logger.log(`Payment ${reference} successful, funds held in escrow`);
    }
    async verifyPayment(reference) {
        const paystackSecretKey = this.configService.get('paystack.secretKey');
        try {
            const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${paystackSecretKey}`,
                },
            });
            const data = await response.json();
            if (data.status && data.data.status === 'success') {
                await this.handleSuccessfulPayment(reference);
                return { verified: true, status: 'success' };
            }
            return { verified: false, status: data.data?.status || 'unknown' };
        }
        catch (error) {
            this.logger.error('Payment verification error:', error);
            throw new common_1.BadRequestException('Failed to verify payment');
        }
    }
    async releaseEscrow(orderId) {
        const payment = await this.prisma.payment.findUnique({
            where: { orderId },
            include: { order: true },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        if (payment.status !== client_1.PaymentStatus.HELD) {
            throw new common_1.BadRequestException('Payment is not in escrow');
        }
        if (payment.order.status !== client_1.OrderStatus.COMPLETED) {
            throw new common_1.BadRequestException('Order must be completed before releasing escrow');
        }
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: client_1.PaymentStatus.RELEASED },
        });
        await this.prisma.vendor.update({
            where: { id: payment.order.vendorId },
            data: { totalSales: { increment: 1 } },
        });
        this.logger.log(`Escrow released for order ${orderId}`);
        return { released: true };
    }
    async refundPayment(orderId, adminId) {
        const payment = await this.prisma.payment.findUnique({
            where: { orderId },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        if (payment.status !== client_1.PaymentStatus.HELD) {
            throw new common_1.BadRequestException('Can only refund payments in escrow');
        }
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: client_1.PaymentStatus.REFUNDED },
        });
        await this.prisma.order.update({
            where: { id: orderId },
            data: { status: client_1.OrderStatus.CANCELLED },
        });
        this.logger.log(`Payment refunded for order ${orderId} by admin ${adminId}`);
        return { refunded: true };
    }
    async getPaymentStatus(orderId, userId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                payment: true,
                vendor: { select: { userId: true } },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.buyerId !== userId && order.vendor.userId !== userId) {
            throw new common_1.ForbiddenException('Access denied');
        }
        return order.payment;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        config_1.ConfigService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map