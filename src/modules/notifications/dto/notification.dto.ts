import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty()
  @IsString()
  fcmToken: string;
}

export class MarkReadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  notificationId?: string;
}
