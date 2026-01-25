import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../../prisma';
import { BadRequestException } from '@nestjs/common';

describe('ReviewsService', () => {
  let service: ReviewsService;

  const mockReview = {
    id: 'review-id',
    rating: 5,
    comment: 'Great product',
    productId: 'product-id',
    reviewerId: 'user-id',
    vendorId: 'vendor-id',
  };

  const mockPrismaService = {
    review: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    vendor: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a review', async () => {
      mockPrismaService.review.findFirst.mockResolvedValue(null);
      mockPrismaService.review.create.mockResolvedValue(mockReview);
      mockPrismaService.review.findMany.mockResolvedValue([{ rating: 5 }]);

      const dto = {
        rating: 5,
        comment: 'Great product',
        productId: 'product-id',
        vendorId: 'vendor-id',
      };

      const result = await service.create('user-id', dto);

      expect(result).toEqual(mockReview);
      expect(mockPrismaService.review.create).toHaveBeenCalled();
      // Verifies vendor rating update called (findMany then update)
      expect(mockPrismaService.review.findMany).toHaveBeenCalled();
      expect(mockPrismaService.vendor.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if already reviewed', async () => {
      mockPrismaService.review.findFirst.mockResolvedValue(mockReview);

      const dto = {
        rating: 5,
        comment: 'Great product',
        productId: 'product-id',
      };

      await expect(service.create('user-id', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
