import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockOrder = {
    id: 'order-id',
    orderNumber: 'ORD-123',
    buyerId: 'user-id',
    totalAmount: {
      mul: jest.fn().mockReturnThis(),
      toNumber: jest.fn().mockReturnValue(10000),
    },
    status: OrderStatus.PENDING,
    payment: null,
    buyer: {
      email: 'buyer@example.com',
      firstName: 'John',
    },
    vendorId: 'vendor-id',
    vendor: {
      userId: 'vendor-user-id',
    },
  };

  const mockPayment = {
    id: 'payment-id',
    orderId: 'order-id',
    amount: 100,
    reference: 'SHOPA-REF',
    status: PaymentStatus.PENDING,
    order: {
      status: OrderStatus.COMPLETED,
      vendorId: 'vendor-id',
    },
  };

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    vendor: {
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'paystack.secretKey') return 'sk_test_123';
      if (key === 'app.frontendUrl') return 'http://localhost:3000';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializePayment', () => {
    it('should initialize payment successfully', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);
      (global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          status: true,
          data: {
            authorization_url: 'https://checkout.paystack.com/123',
            reference: 'SHOPA-REF',
            access_code: '123',
          },
        }),
      });

      const result = await service.initializePayment('user-id', {
        orderId: 'order-id',
      });

      expect(result).toHaveProperty('authorizationUrl');
      expect(mockPrismaService.payment.create).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.paystack.co/transaction/initialize',
        expect.any(Object),
      );
    });

    it('should throw ForbiddenException if user is not buyer', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        buyerId: 'other-user',
      });

      await expect(
        service.initializePayment('user-id', { orderId: 'order-id' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('handlePaystackWebhook', () => {
    it('should handle successful charge event', async () => {
      const payload = {
        event: 'charge.success',
        data: { reference: 'SHOPA-REF' },
      };

      const secret = 'sk_test_123';
      const signature = crypto
        .createHmac('sha512', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      await service.handlePaystackWebhook(payload as any, signature);

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-id' },
        data: expect.objectContaining({ status: PaymentStatus.HELD }),
      });
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order-id' },
        data: { status: OrderStatus.PAID },
      });
    });

    it('should throw ForbiddenException for invalid signature', async () => {
      await expect(
        service.handlePaystackWebhook({} as any, 'invalid-signature'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('releaseEscrow', () => {
    it('should release funds to vendor', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.HELD,
      });

      await service.releaseEscrow('order-id');

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-id' },
        data: { status: PaymentStatus.RELEASED },
      });
      expect(mockPrismaService.vendor.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if order not completed', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.HELD,
        order: { status: OrderStatus.PAID }, // Not COMPLETED
      });

      await expect(service.releaseEscrow('order-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
