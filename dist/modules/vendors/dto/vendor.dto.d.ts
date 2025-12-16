import { VerificationStatus } from '@prisma/client';
export declare class ApplyVendorDto {
    storeName: string;
    description?: string;
    logo?: string;
}
export declare class UpdateVendorDto {
    storeName?: string;
    description?: string;
    logo?: string;
}
export declare class VerifyVendorDto {
    status: VerificationStatus;
}
