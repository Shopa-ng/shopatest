import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '@prisma/client';

export class ApplyVendorDto {
  @ApiProperty({ example: 'Campus Snacks Hub' })
  @IsString()
  storeName: string;

  @ApiPropertyOptional({ example: 'Best snacks on campus!' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;
}

export class UpdateVendorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;
}

export class VerifyVendorDto {
  @ApiProperty({ enum: VerificationStatus })
  status: VerificationStatus;
}
