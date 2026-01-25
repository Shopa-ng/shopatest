import { Test, TestingModule } from '@nestjs/testing';
import { DisputesService } from './disputes.service';
import { PrismaService } from '../../../prisma';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DisputeStatus, OrderStatus } from '@prisma/client';

describe('DisputesService', () => {
  let service: DisputesService;

  const mockOrder = {
    id: 'order-id',
    buyerId: 'user-id',
    vendor: { userId: 'vendor-id' },
    status: OrderStatus.PAID,
  };

  const mockDispute = {
    id: 'dispute-id',
    orderId: 'order-id',
    raisedById: 'user-id',
    reason: 'Defective',
    description: 'Item broken',
    status: DisputeStatus.OPEN,
    createdAt: new Date(),
  };

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
    },
    dispute: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a dispute successfully', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.dispute.findFirst.mockResolvedValue(null);
      mockPrismaService.dispute.create.mockResolvedValue(mockDispute);

      const result = await service.create('user-id', {
        orderId: 'order-id',
        reason: 'Defective',
        description: 'Item broken',
      });

      expect(result).toEqual(mockDispute);
      expect(mockPrismaService.dispute.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not part of order', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.create('other-user', {
          orderId: 'order-id',
          reason: 'Reason',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid order status', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING,
      });

      await expect(
        service.create('user-id', { orderId: 'order-id', reason: 'Reason' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if active dispute exists', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.dispute.findFirst.mockResolvedValue(mockDispute);

      await expect(
        service.create('user-id', { orderId: 'order-id', reason: 'Reason' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolve', () => {
    it('should resolve a dispute', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);
      mockPrismaService.dispute.update.mockResolvedValue({
        ...mockDispute,
        status: DisputeStatus.RESOLVED,
      });

      const result = await service.resolve('dispute-id', 'admin-id', {
        status: DisputeStatus.RESOLVED,
        resolution: 'Refunded',
      });

      expect(result.status).toBe(DisputeStatus.RESOLVED);
      expect(mockPrismaService.dispute.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if already resolved', async () => {
      mockPrismaService.dispute.findUnique.mockResolvedValue({
        ...mockDispute,
        status: DisputeStatus.RESOLVED,
      });

      await expect(
        service.resolve('dispute-id', 'admin-id', {
          status: DisputeStatus.CLOSED,
          resolution: 'Refunded',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
