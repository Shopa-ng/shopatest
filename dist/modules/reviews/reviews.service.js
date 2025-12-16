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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../prisma");
let ReviewsService = class ReviewsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(reviewerId, createDto) {
        const { productId, vendorId, rating, comment } = createDto;
        if (!productId && !vendorId) {
            throw new common_1.BadRequestException('Either productId or vendorId is required');
        }
        const existingReview = await this.prisma.review.findFirst({
            where: {
                reviewerId,
                ...(productId && { productId }),
                ...(vendorId && { vendorId }),
            },
        });
        if (existingReview) {
            throw new common_1.BadRequestException('You have already reviewed this item');
        }
        const review = await this.prisma.review.create({
            data: {
                reviewerId,
                productId,
                vendorId,
                rating,
                comment,
            },
            include: {
                reviewer: { select: { firstName: true, lastName: true } },
            },
        });
        if (vendorId) {
            await this.updateVendorRating(vendorId);
        }
        return review;
    }
    async findByProduct(productId) {
        return this.prisma.review.findMany({
            where: { productId },
            include: {
                reviewer: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findByVendor(vendorId) {
        return this.prisma.review.findMany({
            where: { vendorId },
            include: {
                reviewer: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async update(id, reviewerId, updateDto) {
        const review = await this.prisma.review.findUnique({ where: { id } });
        if (!review) {
            throw new common_1.NotFoundException('Review not found');
        }
        if (review.reviewerId !== reviewerId) {
            throw new common_1.ForbiddenException('You can only update your own reviews');
        }
        const updated = await this.prisma.review.update({
            where: { id },
            data: updateDto,
        });
        if (review.vendorId) {
            await this.updateVendorRating(review.vendorId);
        }
        return updated;
    }
    async delete(id, reviewerId) {
        const review = await this.prisma.review.findUnique({ where: { id } });
        if (!review) {
            throw new common_1.NotFoundException('Review not found');
        }
        if (review.reviewerId !== reviewerId) {
            throw new common_1.ForbiddenException('You can only delete your own reviews');
        }
        await this.prisma.review.delete({ where: { id } });
        if (review.vendorId) {
            await this.updateVendorRating(review.vendorId);
        }
        return { deleted: true };
    }
    async updateVendorRating(vendorId) {
        const reviews = await this.prisma.review.findMany({
            where: { vendorId },
            select: { rating: true },
        });
        if (reviews.length === 0) {
            await this.prisma.vendor.update({
                where: { id: vendorId },
                data: { rating: 0 },
            });
            return;
        }
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        await this.prisma.vendor.update({
            where: { id: vendorId },
            data: { rating: Math.round(avgRating * 10) / 10 },
        });
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map