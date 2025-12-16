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
exports.VendorsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_1 = require("../../prisma");
let VendorsService = class VendorsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async apply(userId, applyDto) {
        const existingVendor = await this.prisma.vendor.findUnique({
            where: { userId },
        });
        if (existingVendor) {
            throw new common_1.ConflictException('You already have a vendor profile');
        }
        const vendor = await this.prisma.vendor.create({
            data: {
                userId,
                ...applyDto,
            },
            include: {
                user: {
                    select: {
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: { role: client_1.UserRole.VENDOR },
        });
        return vendor;
    }
    async findAll(campusId, verifiedOnly = true) {
        return this.prisma.vendor.findMany({
            where: {
                ...(verifiedOnly && {
                    verificationStatus: client_1.VerificationStatus.APPROVED,
                }),
                ...(campusId && {
                    user: { campusId },
                }),
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        campus: { select: { name: true } },
                    },
                },
                _count: {
                    select: { products: true },
                },
            },
            orderBy: { rating: 'desc' },
        });
    }
    async findById(id) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        campus: { select: { name: true, code: true } },
                    },
                },
                products: {
                    where: { isActive: true },
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
                _count: {
                    select: { products: true, orders: true },
                },
            },
        });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor not found');
        }
        return vendor;
    }
    async getMyVendorProfile(userId) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { userId },
            include: {
                _count: {
                    select: { products: true, orders: true },
                },
            },
        });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor profile not found');
        }
        return vendor;
    }
    async update(userId, updateDto) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { userId },
        });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor profile not found');
        }
        return this.prisma.vendor.update({
            where: { userId },
            data: updateDto,
        });
    }
    async verify(id, status) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id },
        });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor not found');
        }
        return this.prisma.vendor.update({
            where: { id },
            data: { verificationStatus: status },
        });
    }
    async findPendingVerifications() {
        return this.prisma.vendor.findMany({
            where: { verificationStatus: client_1.VerificationStatus.PENDING },
            include: {
                user: {
                    select: {
                        email: true,
                        firstName: true,
                        lastName: true,
                        studentIdUrl: true,
                        campus: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }
};
exports.VendorsService = VendorsService;
exports.VendorsService = VendorsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], VendorsService);
//# sourceMappingURL=vendors.service.js.map