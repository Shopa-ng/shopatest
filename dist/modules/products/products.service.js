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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../prisma");
const client_1 = require("@prisma/client");
let ProductsService = class ProductsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(vendorUserId, createDto) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { userId: vendorUserId },
            include: { user: { select: { campusId: true } } },
        });
        if (!vendor) {
            throw new common_1.ForbiddenException('You must be a vendor to create products');
        }
        if (!vendor.user.campusId) {
            throw new common_1.ForbiddenException('You must be assigned to a campus');
        }
        return this.prisma.product.create({
            data: {
                ...createDto,
                price: new client_1.Prisma.Decimal(createDto.price),
                vendorId: vendor.id,
                campusId: vendor.user.campusId,
            },
            include: {
                vendor: { select: { storeName: true } },
                category: { select: { name: true } },
            },
        });
    }
    async findAll(query) {
        const { search, campusId, vendorId, categoryId, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = {
            isActive: true,
            ...(campusId && { campusId }),
            ...(vendorId && { vendorId }),
            ...(categoryId && { categoryId }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const [products, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                include: {
                    vendor: { select: { storeName: true, rating: true } },
                    category: { select: { name: true } },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.product.count({ where }),
        ]);
        return {
            data: products,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findById(id) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                vendor: {
                    select: {
                        id: true,
                        storeName: true,
                        rating: true,
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                category: { select: { name: true } },
                reviews: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        reviewer: { select: { firstName: true, lastName: true } },
                    },
                },
            },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return product;
    }
    async update(id, vendorUserId, updateDto) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: { vendor: { select: { userId: true } } },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        if (product.vendor.userId !== vendorUserId) {
            throw new common_1.ForbiddenException('You can only update your own products');
        }
        return this.prisma.product.update({
            where: { id },
            data: {
                ...updateDto,
                ...(updateDto.price && { price: new client_1.Prisma.Decimal(updateDto.price) }),
            },
        });
    }
    async delete(id, vendorUserId) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: { vendor: { select: { userId: true } } },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        if (product.vendor.userId !== vendorUserId) {
            throw new common_1.ForbiddenException('You can only delete your own products');
        }
        return this.prisma.product.update({
            where: { id },
            data: { isActive: false },
        });
    }
    async getMyProducts(vendorUserId, query) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { userId: vendorUserId },
        });
        if (!vendor) {
            throw new common_1.ForbiddenException('Vendor profile not found');
        }
        return this.findAll({ ...query, vendorId: vendor.id });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map