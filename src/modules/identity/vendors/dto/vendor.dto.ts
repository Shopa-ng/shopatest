import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsInt,
  Min,
  Max,
  ArrayMinSize,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SaleType, VerificationStatus, VendorStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class RegisterVendorDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'Campus Snacks Hub' })
  @IsString()
  storeName: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'john@university.edu.ng' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'campus-uuid' })
  @IsString()
  campusId: string;

  @ApiProperty({ example: ['category-uuid-1', 'category-uuid-2'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  categoryIds: string[];

  @ApiProperty({ example: ['Jollof Rice', 'Shawarma', 'Chapman'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  itemsSold: string[];

  @ApiProperty({ enum: SaleType, example: SaleType.IN_STOCK })
  @IsEnum(SaleType)
  saleType: SaleType;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  @Type(() => Number)
  maxPreorderDays?: number;

  @ApiProperty({ example: 'CU/2021/0001' })
  @IsString()
  matricNumber: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ example: 'https://cloudinary.com/student-id.jpg' })
  @IsOptional()
  @IsString()
  studentIdUrl?: string;
}

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: ['Jollof Rice', 'Chapman'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemsSold?: string[];

  @ApiPropertyOptional({ enum: SaleType })
  @IsOptional()
  @IsEnum(SaleType)
  saleType?: SaleType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  @Type(() => Number)
  maxPreorderDays?: number;
}

export class VerifyVendorDto {
  @ApiProperty({ enum: VendorStatus })
  @IsEnum(VendorStatus)
  status: VendorStatus;

  @ApiPropertyOptional({ example: 'Student ID not valid' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RequestWithdrawalDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(500)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: 'First Bank' })
  @IsString()
  bankName: string;

  @ApiProperty({ example: '0123456789' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  accountName: string;
}

export class ProcessWithdrawalDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'Processed successfully' })
  @IsOptional()
  @IsString()
  note?: string;
}