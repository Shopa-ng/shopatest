import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'campus-uuid' })
  @IsOptional()
  @IsString()
  campusId?: string;
}

export class UploadStudentIdDto {
  @ApiPropertyOptional({ example: 'https://cloudinary.com/...' })
  @IsString()
  studentIdUrl: string;
}
