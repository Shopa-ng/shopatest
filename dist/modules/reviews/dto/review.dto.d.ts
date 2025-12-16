export declare class CreateReviewDto {
    productId?: string;
    vendorId?: string;
    rating: number;
    comment?: string;
}
export declare class UpdateReviewDto {
    rating?: number;
    comment?: string;
}
