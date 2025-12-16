import { PrismaService } from '../../prisma';
import { CreateReviewDto, UpdateReviewDto } from './dto';
export declare class ReviewsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(reviewerId: string, createDto: CreateReviewDto): Promise<{
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
        productId: string | null;
        comment: string | null;
        reviewerId: string;
    }>;
    findByProduct(productId: string): Promise<({
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
        productId: string | null;
        comment: string | null;
        reviewerId: string;
    })[]>;
    findByVendor(vendorId: string): Promise<({
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
        productId: string | null;
        comment: string | null;
        reviewerId: string;
    })[]>;
    update(id: string, reviewerId: string, updateDto: UpdateReviewDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        vendorId: string | null;
        productId: string | null;
        comment: string | null;
        reviewerId: string;
    }>;
    delete(id: string, reviewerId: string): Promise<{
        deleted: boolean;
    }>;
    private updateVendorRating;
}
