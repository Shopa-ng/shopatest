export declare class CreateProductDto {
    name: string;
    description?: string;
    price: number;
    stock?: number;
    images?: string[];
    categoryId?: string;
}
export declare class UpdateProductDto {
    name?: string;
    description?: string;
    price?: number;
    stock?: number;
    images?: string[];
    isActive?: boolean;
    categoryId?: string;
}
export declare class ProductQueryDto {
    search?: string;
    campusId?: string;
    vendorId?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
