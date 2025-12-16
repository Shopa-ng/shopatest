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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_1 = require("../../prisma");
let OrdersService = class OrdersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(buyerId, createDto) {
        const { items, deliveryAddress, deliveryMethod, notes } = createDto;
        const productIds = items.map((item) => item.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds }, isActive: true },
            include: { vendor: true },
        });
        if (products.length !== productIds.length) {
            throw new common_1.BadRequestException('One or more products not found or inactive');
        }
        const vendorIds = [...new Set(products.map((p) => p.vendorId))];
        if (vendorIds.length > 1) {
            throw new common_1.BadRequestException('All products must be from the same vendor');
        }
        let totalAmount = new client_1.Prisma.Decimal(0);
        const orderItemsData = items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            const itemTotal = product.price.mul(item.quantity);
            totalAmount = totalAmount.add(itemTotal);
            return {
                productId: item.productId,
                quantity: item.quantity,
                price: product.price,
            };
        });
        return this.prisma.order.create({
            data: {
                buyerId,
                vendorId: vendorIds[0],
                totalAmount,
                deliveryAddress,
                deliveryMethod,
                notes,
                orderItems: {
                    create: orderItemsData,
                },
            },
            include: {
                orderItems: {
                    include: { product: { select: { name: true, images: true } } },
                },
                vendor: { select: { storeName: true } },
            },
        });
    }
    async findByBuyer(buyerId) {
        return this.prisma.order.findMany({
            where: { buyerId },
            include: {
                orderItems: {
                    include: { product: { select: { name: true, images: true } } },
                },
                vendor: { select: { storeName: true } },
                payment: { select: { status: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findByVendor(vendorUserId) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { userId: vendorUserId },
        });
        if (!vendor) {
            throw new common_1.ForbiddenException('Vendor profile not found');
        }
        return this.prisma.order.findMany({
            where: { vendorId: vendor.id },
            include: {
                orderItems: {
                    include: { product: { select: { name: true } } },
                },
                buyer: { select: { firstName: true, lastName: true } },
                payment: { select: { status: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findById(id, userId) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                orderItems: {
                    include: { product: true },
                },
                buyer: {
                    select: { id: true, firstName: true, lastName: true, phone: true },
                },
                vendor: {
                    select: {
                        id: true,
                        storeName: true,
                        userId: true,
                        user: { select: { firstName: true, phone: true } },
                    },
                },
                payment: true,
                disputes: true,
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.buyerId !== userId && order.vendor.userId !== userId) {
            throw new common_1.ForbiddenException('You do not have access to this order');
        }
        return order;
    }
    async updateStatus(id, userId, updateDto) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: { vendor: { select: { userId: true } } },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.vendor.userId !== userId &&
            updateDto.status !== client_1.OrderStatus.CANCELLED) {
            throw new common_1.ForbiddenException('Only the vendor can update order status');
        }
        const validTransitions = {
            PENDING: [client_1.OrderStatus.CANCELLED],
            PAID: [client_1.OrderStatus.CONFIRMED, client_1.OrderStatus.CANCELLED],
            CONFIRMED: [client_1.OrderStatus.SHIPPED],
            SHIPPED: [client_1.OrderStatus.DELIVERED],
            DELIVERED: [client_1.OrderStatus.COMPLETED],
            COMPLETED: [],
            CANCELLED: [],
        };
        if (!validTransitions[order.status].includes(updateDto.status)) {
            throw new common_1.BadRequestException(`Cannot transition from ${order.status} to ${updateDto.status}`);
        }
        return this.prisma.order.update({
            where: { id },
            data: { status: updateDto.status },
        });
    }
    async confirmDelivery(id, buyerId) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: { payment: true },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.buyerId !== buyerId) {
            throw new common_1.ForbiddenException('Only the buyer can confirm delivery');
        }
        if (order.status !== client_1.OrderStatus.DELIVERED) {
            throw new common_1.BadRequestException('Order must be marked as delivered first');
        }
        return this.prisma.order.update({
            where: { id },
            data: { status: client_1.OrderStatus.COMPLETED },
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map