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
        price: import("@prisma/client/runtime/library").Decimal;
        stock: number;
        images: string[];
        categoryId: string | null;
        vendorId: string;
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
        categoryId: string | null;
        vendorId: string;
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
        categoryId: string | null;
        vendorId: string;
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
        categoryId: string | null;
        vendorId: string;
    }>;
}
