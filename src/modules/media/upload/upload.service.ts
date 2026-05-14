import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('cloudinary.cloudName'),
      api_key: this.configService.get<string>('cloudinary.apiKey'),
      api_secret: this.configService.get<string>('cloudinary.apiSecret'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'shopa',
    removeBackground: boolean = false,
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed',
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    try {
      let buffer = file.buffer;

      if (removeBackground) {
        buffer = await this.removeBackground(buffer).catch((e) => {
          this.logger.warn(`Background removal failed, using original: ${e?.message}`);
          return file.buffer;
        });
      }

      const result = await this.uploadToCloudinary(buffer, folder);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      };
    } catch (error) {
      this.logger.error('Cloudinary upload error:', error);
      throw new BadRequestException('Failed to upload file');
    }
  }

  private async removeBackground(buffer: Buffer): Promise<Buffer> {
    const apiKey = this.configService.get<string>('REMOVE_BG_API_KEY') ?? process.env.REMOVE_BG_API_KEY;
    if (!apiKey) throw new Error('REMOVE_BG_API_KEY not configured');

    const formData = new FormData();
    formData.append('image_file', new Blob([new Uint8Array(buffer)]), 'image.png');
    formData.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`remove.bg error ${response.status}: ${err}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'shopa',
  ): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  async deleteImage(publicId: string): Promise<boolean> {
    try {
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (error) {
      this.logger.error('Cloudinary delete error:', error);
      return false;
    }
  }

  private uploadToCloudinary(
    buffer: Buffer,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: 'image',
            transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }],
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result!);
            }
          },
        )
        .end(buffer);
    });
  }

  // Get optimized URL with transformations
  getOptimizedUrl(
    publicId: string,
    options: { width?: number; height?: number; crop?: string } = {},
  ): string {
    return cloudinary.url(publicId, {
      secure: true,
      transformation: [
        {
          width: options.width,
          height: options.height,
          crop: options.crop || 'fill',
          quality: 'auto',
          fetch_format: 'auto',
        },
      ],
    });
  }
}
