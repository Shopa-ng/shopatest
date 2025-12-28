import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
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
}

export class ResolveDisputeDto {
  @ApiProperty({ enum: DisputeStatus })
  @IsEnum(DisputeStatus)
  status: DisputeStatus;

  @ApiProperty({ example: 'Full refund issued to buyer' })
  @IsString()
  resolution: string;
}
