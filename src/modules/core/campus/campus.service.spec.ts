import { Test, TestingModule } from '@nestjs/testing';
import { CampusService } from './campus.service';
import { PrismaService } from '../../../prisma';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('CampusService', () => {
  let service: CampusService;
  let prismaService: PrismaService;

  const mockCampus = {
    id: 'campus-id',
    name: 'Main Campus',
    code: 'MAIN',
    location: 'City',
    isActive: true,
  };

  const mockPrismaService = {
    campus: {
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
        CampusService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CampusService>(CampusService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a campus', async () => {
      mockPrismaService.campus.findFirst.mockResolvedValue(null);
      mockPrismaService.campus.create.mockResolvedValue(mockCampus);

      const dto = {
        name: 'Main Campus',
        code: 'MAIN',
        location: 'City',
      };

      const result = await service.create(dto);

      expect(result).toEqual(mockCampus);
    });

    it('should throw ConflictException if code exists', async () => {
      mockPrismaService.campus.findFirst.mockResolvedValue(mockCampus);

      await expect(
        service.create({ name: 'Other', code: 'MAIN' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update campus', async () => {
      mockPrismaService.campus.findUnique.mockResolvedValue(mockCampus);
      mockPrismaService.campus.update.mockResolvedValue({
        ...mockCampus,
        name: 'New Name',
      });

      const result = await service.update('campus-id', { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });
  });
});
