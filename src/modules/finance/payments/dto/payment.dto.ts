import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUrl, IsUUID } from 'class-validator';

export class InitializePaymentDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({ description: 'Override the Paystack callback URL' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  callbackUrl?: string;
}

export class PaystackWebhookDto {
  @ApiProperty()
  event: string;

  @ApiProperty()
  data: {
    reference: string;
    status: string;
    amount: number;
    customer: {
      email: string;
    };
    metadata?: Record<string, any>;
  };
}

export class PaymentResponseDto {
  @ApiProperty()
  authorizationUrl: string;

  @ApiProperty()
  reference: string;

  @ApiProperty()
  accessCode: string;
}
