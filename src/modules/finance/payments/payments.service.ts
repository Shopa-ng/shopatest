import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../../prisma';
import { InitializePaymentDto, PaystackWebhookDto } from './dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async initializePayment(userId: string, dto: InitializePaymentDto) {
    const { orderId } = dto;

    // Get order
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { email: true, firstName: true } },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== userId) {
      throw new ForbiddenException('You can only pay for your own orders');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not in pending status');
    }

    if (order.payment) {
      throw new BadRequestException('Payment already exists for this order');
    }

    // Generate reference
    const reference = `SHOPA-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create payment record
    await this.prisma.payment.create({
      data: {
        orderId,
        amount: order.totalAmount,
        reference,
        provider: 'paystack',
        status: PaymentStatus.PENDING,
      },
    });

    // Initialize Paystack payment
    const paystackSecretKey =
      this.configService.get<string>('paystack.secretKey');
    const amountInKobo = order.totalAmount.mul(100).toNumber();

    try {
      const response = await fetch(
        'https://api.paystack.co/transaction/initialize',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: order.buyer.email,
            amount: amountInKobo,
            reference,
            callback_url: `${this.configService.get('app.frontendUrl')}/payment/callback`,
            metadata: {
              orderId,
              orderNumber: order.orderNumber,
              buyerName: order.buyer.firstName,
            },
          }),
        },
      );

      const data = await response.json();

      if (!data.status) {
        throw new BadRequestException(
          data.message || 'Failed to initialize payment',
        );
      }

      return {
        authorizationUrl: data.data.authorization_url,
        reference: data.data.reference,
        accessCode: data.data.access_code,
      };
    } catch (error) {
      this.logger.error('Paystack initialization error:', error);
      throw new BadRequestException('Failed to initialize payment');
    }
  }

  async handlePaystackWebhook(body: PaystackWebhookDto, signature: string) {
    const secret = this.configService.get<string>('paystack.secretKey');
    const hash = crypto
      .createHmac('sha512', secret!)
      .update(JSON.stringify(body))
      .digest('hex');

    if (hash !== signature) {
      throw new ForbiddenException('Invalid signature');
    }

    const { event, data } = body;

    if (event === 'charge.success') {
      await this.handleSuccessfulPayment(data.reference);
    }

    return { received: true };
  }

  private async handleSuccessfulPayment(reference: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
      include: { order: true },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for reference: ${reference}`);
      return;
    }

    // Update payment to HELD (escrow)
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.HELD,
        escrowReleaseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Update order to PAID
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.PAID },
    });

    this.logger.log(`Payment ${reference} successful, funds held in escrow`);
  }

  async verifyPayment(reference: string) {
    const paystackSecretKey =
      this.configService.get<string>('paystack.secretKey');

    try {
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
          },
        },
      );

      const data = await response.json();

      if (data.status && data.data.status === 'success') {
        await this.handleSuccessfulPayment(reference);
        return { verified: true, status: 'success' };
      }

      return { verified: false, status: data.data?.status || 'unknown' };
    } catch (error) {
      this.logger.error('Payment verification error:', error);
      throw new BadRequestException('Failed to verify payment');
    }
  }

  async releaseEscrow(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.HELD) {
      throw new BadRequestException('Payment is not in escrow');
    }

    if (payment.order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'Order must be completed before releasing escrow',
      );
    }

    // Release funds to vendor (in production, this would trigger a payout)
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.RELEASED },
    });

    // Update vendor total sales
    await this.prisma.vendor.update({
      where: { id: payment.order.vendorId },
      data: { totalSales: { increment: 1 } },
    });

    this.logger.log(`Escrow released for order ${orderId}`);

    return { released: true };
  }

  async refundPayment(orderId: string, adminId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.HELD) {
      throw new BadRequestException('Can only refund payments in escrow');
    }

    // In production, this would trigger a Paystack refund
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.REFUNDED },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });

    this.logger.log(
      `Payment refunded for order ${orderId} by admin ${adminId}`,
    );

    return { refunded: true };
  }

  async getPaymentStatus(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        vendor: { select: { userId: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== userId && order.vendor.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return order.payment;
  }
}
