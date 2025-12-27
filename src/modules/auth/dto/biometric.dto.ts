import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnableBiometricDto {
  @ApiProperty({ description: 'Device ID for biometric authentication' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ description: 'Platform (ios or android)' })
  @IsString()
  @IsNotEmpty()
  platform: string;
}

export class BiometricLoginDto {
  @ApiProperty({ description: 'Biometric token stored on device' })
  @IsString()
  @IsNotEmpty()
  biometricToken: string;

  @ApiProperty({ description: 'Device ID' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}
