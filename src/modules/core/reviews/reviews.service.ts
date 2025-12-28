import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma';
import { CreateReviewDto, UpdateReviewDto } from './dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(reviewerId: string, createDto: CreateReviewDto) {
    const { productId, vendorId, rating, comment } = createDto;

    if (!productId && !vendorId) {
      throw new BadRequestException('Either productId or vendorId is required');
    }

    // Check if review already exists
    const existingReview = await this.prisma.review.findFirst({
      where: {
        reviewerId,
        ...(productId && { productId }),
        ...(vendorId && { vendorId }),
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this item');
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

    // Update vendor rating if vendor review
    if (vendorId) {
      await this.updateVendorRating(vendorId);
    }

    return review;
  }

  async findByProduct(productId: string) {
    return this.prisma.review.findMany({
      where: { productId },
      include: {
        reviewer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByVendor(vendorId: string) {
    return this.prisma.review.findMany({
      where: { vendorId },
      include: {
        reviewer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, reviewerId: string, updateDto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.reviewerId !== reviewerId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: updateDto,
    });

    // Update vendor rating if vendor review
    if (review.vendorId) {
      await this.updateVendorRating(review.vendorId);
    }

    return updated;
  }

  async delete(id: string, reviewerId: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.reviewerId !== reviewerId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({ where: { id } });

    // Update vendor rating if vendor review
    if (review.vendorId) {
      await this.updateVendorRating(review.vendorId);
    }

    return { deleted: true };
  }

  private async updateVendorRating(vendorId: string) {
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

    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { rating: Math.round(avgRating * 10) / 10 },
    });
  }
}
