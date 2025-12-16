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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../prisma");
const client_1 = require("@prisma/client");
let DisputesService = class DisputesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, createDto) {
        const { orderId, reason, description } = createDto;
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { vendor: { select: { userId: true } } },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.buyerId !== userId && order.vendor.userId !== userId) {
            throw new common_1.ForbiddenException('You cannot create a dispute for this order');
        }
        const validStatuses = [
            client_1.OrderStatus.PAID,
            client_1.OrderStatus.CONFIRMED,
            client_1.OrderStatus.SHIPPED,
            client_1.OrderStatus.DELIVERED,
        ];
        if (!validStatuses.includes(order.status)) {
            throw new common_1.BadRequestException('Cannot create dispute for this order status');
        }
        const existingDispute = await this.prisma.dispute.findFirst({
            where: {
                orderId,
                status: { in: [client_1.DisputeStatus.OPEN, client_1.DisputeStatus.UNDER_REVIEW] },
            },
        });
        if (existingDispute) {
            throw new common_1.BadRequestException('An active dispute already exists for this order');
        }
        return this.prisma.dispute.create({
            data: {
                orderId,
                raisedById: userId,
                reason,
                description,
            },
            include: {
                order: { select: { orderNumber: true } },
                raisedBy: { select: { firstName: true, lastName: true } },
            },
        });
    }
    async findByUser(userId) {
        return this.prisma.dispute.findMany({
            where: { raisedById: userId },
            include: {
                order: { select: { orderNumber: true, totalAmount: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findAll(status) {
        return this.prisma.dispute.findMany({
            where: status ? { status } : undefined,
            include: {
                order: {
                    select: {
                        orderNumber: true,
                        totalAmount: true,
                        buyer: { select: { firstName: true, lastName: true } },
                        vendor: { select: { storeName: true } },
                    },
                },
                raisedBy: { select: { firstName: true, lastName: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findById(id) {
        const dispute = await this.prisma.dispute.findUnique({
            where: { id },
            include: {
                order: {
                    include: {
                        orderItems: {
                            include: { product: { select: { name: true, images: true } } },
                        },
                        buyer: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true,
                            },
                        },
                        vendor: {
                            select: {
                                storeName: true,
                                user: {
                                    select: { firstName: true, lastName: true, email: true },
                                },
                            },
                        },
                        payment: { select: { status: true, amount: true } },
                    },
                },
                raisedBy: { select: { firstName: true, lastName: true, email: true } },
                resolvedBy: { select: { firstName: true, lastName: true } },
            },
        });
        if (!dispute) {
            throw new common_1.NotFoundException('Dispute not found');
        }
        return dispute;
    }
    async resolve(id, adminId, resolveDto) {
        const dispute = await this.prisma.dispute.findUnique({
            where: { id },
        });
        if (!dispute) {
            throw new common_1.NotFoundException('Dispute not found');
        }
        if (dispute.status === client_1.DisputeStatus.RESOLVED ||
            dispute.status === client_1.DisputeStatus.CLOSED) {
            throw new common_1.BadRequestException('Dispute is already resolved or closed');
        }
        return this.prisma.dispute.update({
            where: { id },
            data: {
                status: resolveDto.status,
                resolution: resolveDto.resolution,
                resolvedById: adminId,
            },
        });
    }
};
exports.DisputesService = DisputesService;
exports.DisputesService = DisputesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], DisputesService);
//# sourceMappingURL=disputes.service.js.map