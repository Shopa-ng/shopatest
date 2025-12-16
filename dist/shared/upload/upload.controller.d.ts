import { UploadService } from './upload.service';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    uploadImage(file: Express.Multer.File, folder?: string): Promise<import("./upload.service").UploadResult>;
    uploadImages(files: Express.Multer.File[], folder?: string): Promise<import("./upload.service").UploadResult[]>;
}
