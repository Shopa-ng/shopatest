import { ConfigService } from '@nestjs/config';
export interface UploadResult {
    url: string;
    publicId: string;
    width?: number;
    height?: number;
    format?: string;
}
export declare class UploadService {
    private configService;
    private readonly logger;
    constructor(configService: ConfigService);
    uploadImage(file: Express.Multer.File, folder?: string): Promise<UploadResult>;
    uploadMultipleImages(files: Express.Multer.File[], folder?: string): Promise<UploadResult[]>;
    deleteImage(publicId: string): Promise<boolean>;
    private uploadToCloudinary;
    getOptimizedUrl(publicId: string, options?: {
        width?: number;
        height?: number;
        crop?: string;
    }): string;
}
