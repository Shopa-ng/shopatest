import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePickupLocationDto {
  @ApiProperty({ example: 'Main Gate' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Near the security post' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateCampusDto {
  @ApiProperty({ example: 'University of Lagos' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'UNILAG' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'Lagos, Nigeria' })
  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateCampusDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
