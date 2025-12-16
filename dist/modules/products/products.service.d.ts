import { PrismaService } from '../../prisma';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto';
import { Prisma } from '@prisma/client';
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(vendorUserId: string, createDto: CreateProductDto): Promise<{
        vendor: {
            storeName: string;
        };
        category: {
            name: string;
        } | null;
    } & {
        name: string;
        description: string | null;
        campusId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        price: Prisma.Decimal;
        stock: number;
        images: string[];
        categoryId: string | null;
        vendorId: string;
    }>;
    findAll(query: ProductQueryDto): Promise<{
        data: ({
            vendor: {
                storeName: string;
                rating: number;
            };
            category: {
                name: string;
            } | null;
        } & {
            name: string;
            description: string | null;
            campusId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            price: Prisma.Decimal;
            stock: number;
            images: string[];
            categoryId: string | null;
            vendorId: string;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findById(id: string): Promise<{
        vendor: {
            user: {
                firstName: string;
                lastName: string;
            };
            id: string;
            storeName: string;
            rating: number;
        };
        category: {
            name: string;
        } | null;
        reviews: ({
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
        })[];
    } & {
        name: string;
        description: string | null;
        campusId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        price: Prisma.Decimal;
        stock: number;
        images: string[];
        categoryId: string | null;
        vendorId: string;
    }>;
    update(id: string, vendorUserId: string, updateDto: UpdateProductDto): Promise<{
        name: string;
        description: string | null;
        campusId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        price: Prisma.Decimal;
        stock: number;
        images: string[];
        categoryId: string | null;
        vendorId: string;
    }>;
    delete(id: string, vendorUserId: string): Promise<{
        name: string;
        description: string | null;
        campusId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        price: Prisma.Decimal;
        stock: number;
        images: string[];
        categoryId: string | null;
        vendorId: string;
    }>;
    getMyProducts(vendorUserId: string, query: ProductQueryDto): Promise<{
        data: ({
            vendor: {
                storeName: string;
                rating: number;
            };
            category: {
                name: string;
            } | null;
        } & {
            name: string;
            description: string | null;
            campusId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            price: Prisma.Decimal;
            stock: number;
            images: string[];
            categoryId: string | null;
            vendorId: string;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
