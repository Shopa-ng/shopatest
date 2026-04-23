import { IsString, IsOptional, IsUUID, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeStatus } from '@prisma/client';

export class CreateDisputeDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiProperty({ example: 'Item not as described' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    example: 'The product color is different from the listing',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: '0123456789, Access Bank, John Doe',
  })
  @IsOptional()
  @IsString()
  accountDetails?: string;

  @ApiPropertyOptional({
    example: ['https://cloudinary.com/proof1.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  proofUrls?: string[];
}

export class ResolveDisputeDto {
  @ApiProperty({ enum: DisputeStatus })
  @IsEnum(DisputeStatus)
  status: DisputeStatus;

  @ApiProperty({ example: 'Full refund issued to buyer' })
  @IsString()
  resolution: string;
}
export class RespondToDisputeDto {
  @ApiProperty({ example: 'The item was delivered in perfect condition' })
  @IsString()
  response: string;
}