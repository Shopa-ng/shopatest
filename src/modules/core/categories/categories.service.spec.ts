import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockCategory = {
    id: 'category-id',
    name: 'Electronics',
    description: 'Gadgets',
    icon: 'icon.png',
    isActive: true,
  };

  const mockPrismaService = {
    category: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a category', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue(mockCategory);

      const dto = {
        name: 'Electronics',
        description: 'Gadgets',
      };

      const result = await service.create(dto);

      expect(result).toEqual(mockCategory);
    });

    it('should throw ConflictException if name exists', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      await expect(service.create({ name: 'Electronics' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('should update category', async () => {
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce(mockCategory) // For findById
        .mockResolvedValueOnce(null); // For checkConflict

      mockPrismaService.category.update.mockResolvedValue({
        ...mockCategory,
        name: 'New Name',
      });

      const result = await service.update('category-id', { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });
  });
});
