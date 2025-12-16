import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
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
            price: import("@prisma/client/runtime/library").Decimal;
            stock: number;
            images: string[];
            vendorId: string;
            categoryId: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getMyProducts(userId: string, query: ProductQueryDto): Promise<{
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
            price: import("@prisma/client/runtime/library").Decimal;
            stock: number;
            images: string[];
            vendorId: string;
            categoryId: string | null;
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
            comment: string | null;
            reviewerId: string;
            productId: string | null;
        })[];
    } & {
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
    }>;
    create(userId: string, createDto: CreateProductDto): Promise<{
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
        price: import("@prisma/client/runtime/library").Decimal;
        stock: number;
        images: string[];
        vendorId: string;
        categoryId: string | null;
    }>;
    update(id: string, userId: string, updateDto: UpdateProductDto): Promise<{
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
    }>;
    delete(id: string, userId: string): Promise<{
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
    }>;
}
