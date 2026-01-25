import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: PrismaService;

  const mockProduct = {
    id: 'product-id',
    name: 'Test Product',
    price: new Prisma.Decimal(100),
    vendorId: 'vendor-id',
    isActive: true,
  };

  const mockOrder = {
    id: 'order-id',
    status: OrderStatus.PENDING,
    buyerId: 'buyer-id',
    vendorId: 'vendor-id',
    vendor: { userId: 'vendor-user-id' },
    totalAmount: 100,
  };

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    vendor: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an order', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.order.create.mockResolvedValue(mockOrder);

      const dto = {
        items: [{ productId: 'product-id', quantity: 1 }],
        deliveryAddress: 'Address',
      };

      const result = await service.create('buyer-id', dto);

      expect(result).toEqual(mockOrder);
      expect(mockPrismaService.order.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if products from different vendors', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        { ...mockProduct, vendorId: 'v1' },
        { ...mockProduct, vendorId: 'v2', id: 'p2' },
      ]);

      const dto = {
        items: [
          { productId: 'product-id', quantity: 1 },
          { productId: 'p2', quantity: 1 },
        ],
        deliveryAddress: 'Address',
      };

      await expect(service.create('buyer-id', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      });

      const result = await service.updateStatus('order-id', 'vendor-user-id', {
        status: OrderStatus.CANCELLED,
      });

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw BadRequestException for invalid transition', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.updateStatus('order-id', 'vendor-user-id', {
          status: OrderStatus.COMPLETED, // Invalid from PENDING
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmDelivery', () => {
    it('should confirm delivery', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.DELIVERED,
      });
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.COMPLETED,
      });

      const result = await service.confirmDelivery('order-id', 'buyer-id');

      expect(result.status).toBe(OrderStatus.COMPLETED);
    });

    it('should throw BadRequestException if not delivered yet', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SHIPPED,
      });

      await expect(
        service.confirmDelivery('order-id', 'buyer-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
