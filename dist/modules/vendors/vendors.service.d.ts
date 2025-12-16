import { VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { ApplyVendorDto, UpdateVendorDto } from './dto';
export declare class VendorsService {
    private prisma;
    constructor(prisma: PrismaService);
    apply(userId: string, applyDto: ApplyVendorDto): Promise<{
        user: {
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        description: string | null;
        id: string;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        storeName: string;
        logo: string | null;
        rating: number;
        totalSales: number;
    }>;
    findAll(campusId?: string, verifiedOnly?: boolean): Promise<({
        user: {
            campus: {
                name: string;
            } | null;
            firstName: string;
            lastName: string;
        };
        _count: {
            products: number;
        };
    } & {
        description: string | null;
        id: string;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        storeName: string;
        logo: string | null;
        rating: number;
        totalSales: number;
    })[]>;
    findById(id: string): Promise<{
        user: {
            campus: {
                name: string;
                code: string;
            } | null;
            firstName: string;
            lastName: string;
        };
        _count: {
            products: number;
            orders: number;
        };
        products: {
            name: string;
            description: string | null;
            campusId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            price: import("@prisma/client/runtime/library").Decimal;
            stock: number;
            images: string[];
            vendorId: string;
            categoryId: string | null;
        }[];
    } & {
        description: string | null;
        id: string;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        storeName: string;
        logo: string | null;
        rating: number;
        totalSales: number;
    }>;
    getMyVendorProfile(userId: string): Promise<{
        _count: {
            products: number;
            orders: number;
        };
    } & {
        description: string | null;
        id: string;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        storeName: string;
        logo: string | null;
        rating: number;
        totalSales: number;
    }>;
    update(userId: string, updateDto: UpdateVendorDto): Promise<{
        description: string | null;
        id: string;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        storeName: string;
        logo: string | null;
        rating: number;
        totalSales: number;
    }>;
    verify(id: string, status: VerificationStatus): Promise<{
        description: string | null;
        id: string;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        storeName: string;
        logo: string | null;
        rating: number;
        totalSales: number;
    }>;
    findPendingVerifications(): Promise<({
        user: {
            campus: {
                name: string;
            } | null;
            email: string;
            firstName: string;
            lastName: string;
            studentIdUrl: string | null;
        };
    } & {
        description: string | null;
        id: string;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        storeName: string;
        logo: string | null;
        rating: number;
        totalSales: number;
    })[]>;
}
