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
        comment: string | null;
        reviewerId: string;
        productId: string | null;
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
        comment: string | null;
        reviewerId: string;
        productId: string | null;
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
        comment: string | null;
        reviewerId: string;
        productId: string | null;
    })[]>;
    update(id: string, reviewerId: string, updateDto: UpdateReviewDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        vendorId: string | null;
        comment: string | null;
        reviewerId: string;
        productId: string | null;
    }>;
    delete(id: string, reviewerId: string): Promise<{
        deleted: boolean;
    }>;
    private updateVendorRating;
}
