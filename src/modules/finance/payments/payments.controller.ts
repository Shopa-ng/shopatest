import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from 'src/common/decorators';
import { RolesGuard } from 'src/common/guards';
import { JwtAuthGuard } from 'src/modules/identity/auth/guards';
import { InitializePaymentDto, PaystackWebhookDto } from './dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize payment for an order' })
  async initialize(
    @CurrentUser('id') userId: string,
    @Body() dto: InitializePaymentDto,
  ) {
    return this.paymentsService.initializePayment(userId, dto);
  }

  @Post('webhook/paystack')
  @HttpCode(200)
  @ApiOperation({ summary: 'Paystack webhook handler' })
  async paystackWebhook(
    @Body() body: PaystackWebhookDto,
    @Headers('x-paystack-signature') signature: string,
  ) {
    return this.paymentsService.handlePaystackWebhook(body, signature);
  }

  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify payment status' })
  async verify(@Param('reference') reference: string) {
    return this.paymentsService.verifyPayment(reference);
  }

  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment status for an order' })
  async getStatus(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.getPaymentStatus(orderId, userId);
  }

  @Post(':orderId/release')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Release escrow (Admin)' })
  async releaseEscrow(@Param('orderId') orderId: string) {
    return this.paymentsService.releaseEscrow(orderId);
  }

  @Post(':orderId/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund payment (Admin)' })
  async refund(
    @Param('orderId') orderId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.paymentsService.refundPayment(orderId, adminId);
  }
}
