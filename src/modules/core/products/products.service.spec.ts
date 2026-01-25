import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockProduct = {
    id: 'product-id',
    name: 'Test Product',
    description: 'Description',
    price: { toNumber: () => 100 },
    vendorId: 'vendor-id',
    vendor: {
      id: 'vendor-id',
      userId: 'vendor-user-id',
      storeName: 'Test Store',
    },
    campusId: 'campus-id',
    isActive: true,
  };

  const mockVendor = {
    id: 'vendor-id',
    userId: 'vendor-user-id',
    user: { campusId: 'campus-id' },
  };

  const mockPrismaService = {
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
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
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a product', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrismaService.product.create.mockResolvedValue(mockProduct);

      const dto = {
        name: 'Test Product',
        price: 100,
        description: 'Description',
        stock: 10,
        categoryId: 'cat-id',
      };

      const result = await service.create('vendor-user-id', dto);

      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.product.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user not a vendor', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(null);

      await expect(service.create('user-id', {} as any)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.product.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual([mockProduct]);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('update', () => {
    it('should update product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue({
        ...mockProduct,
        name: 'Updated',
      });

      const result = await service.update('product-id', 'vendor-user-id', {
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      await expect(
        service.update('product-id', 'other-user', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should soft delete product', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue({
        ...mockProduct,
        isActive: false,
      });

      await service.delete('product-id', 'vendor-user-id');

      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id' },
        data: { isActive: false },
      });
    });
  });
});
