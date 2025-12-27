import { VendorsService } from './vendors.service';
import { ApplyVendorDto, UpdateVendorDto, VerifyVendorDto } from './dto';
export declare class VendorsController {
    private readonly vendorsService;
    constructor(vendorsService: VendorsService);
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
    getMyProfile(userId: string): Promise<{
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
    getPending(): Promise<({
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
            categoryId: string | null;
            vendorId: string;
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
    verify(id: string, verifyDto: VerifyVendorDto): Promise<{
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
}
