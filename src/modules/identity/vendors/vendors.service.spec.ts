import { Test, TestingModule } from '@nestjs/testing';
import { VendorsService } from './vendors.service';
import { PrismaService } from '../../../prisma';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole, VerificationStatus } from '@prisma/client';

describe('VendorsService', () => {
  let service: VendorsService;
  let prismaService: PrismaService;

  const mockVendor = {
    id: 'vendor-id',
    userId: 'user-id',
    storeName: 'Test Store',
    description: 'A test store',
    logoUrl: 'logo.jpg',
    verificationStatus: VerificationStatus.PENDING,
    rating: 4.5,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      firstName: 'John',
      lastName: 'Doe',
      campus: { name: 'Test Campus' },
    },
  };

  const mockPrismaService = {
    vendor: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('apply', () => {
    it('should create a new vendor profile', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(null);
      mockPrismaService.vendor.create.mockResolvedValue(mockVendor);
      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-id',
        role: UserRole.VENDOR,
      });

      const dto = {
        storeName: 'Test Store',
        description: 'A test store',
        logoUrl: 'logo.jpg',
      };

      const result = await service.apply('user-id', dto);

      expect(result).toEqual(mockVendor);
      expect(mockPrismaService.vendor.create).toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { role: UserRole.VENDOR },
      });
    });

    it('should throw ConflictException if user already has a vendor profile', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);

      await expect(
        service.apply('user-id', {
          storeName: 'Test Store',
          description: 'A test store',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return a vendor if found', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);

      const result = await service.findById('vendor-id');

      expect(result).toEqual(mockVendor);
    });

    it('should throw NotFoundException if vendor not found', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(null);

      await expect(service.findById('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update vendor profile', async () => {
      mockPrismaService.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrismaService.vendor.update.mockResolvedValue({
        ...mockVendor,
        storeName: 'Updated Store',
      });

      const result = await service.update('user-id', {
        storeName: 'Updated Store',
      });

      expect(result.storeName).toBe('Updated Store');
    });
  });
});
