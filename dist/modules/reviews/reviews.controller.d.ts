import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    getProductReviews(productId: string): Promise<({
        reviewer: {
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        vendorId: string | null;
        comment: string | null;
        reviewerId: string;
        productId: string | null;
    })[]>;
    getVendorReviews(vendorId: string): Promise<({
        reviewer: {
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        vendorId: string | null;
        comment: string | null;
        reviewerId: string;
        productId: string | null;
    })[]>;
    create(userId: string, createDto: CreateReviewDto): Promise<{
        reviewer: {
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        vendorId: string | null;
        comment: string | null;
        reviewerId: string;
        productId: string | null;
    }>;
    update(id: string, userId: string, updateDto: UpdateReviewDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        vendorId: string | null;
        comment: string | null;
        reviewerId: string;
        productId: string | null;
    }>;
    delete(id: string, userId: string): Promise<{
        deleted: boolean;
    }>;
}
