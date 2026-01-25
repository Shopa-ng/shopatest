import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from 'src/prisma';
import { NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaService: PrismaService;

  const mockNotification = {
    id: 'notif-id',
    userId: 'user-id',
    type: NotificationType.ORDER_UPDATE,
    title: 'Order Status',
    body: 'Your order is shipped',
    isRead: false,
    createdAt: new Date(),
  };

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a notification', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        fcmToken: 'token',
      });
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      // Mock private method if needed, but here we just test public flow
      // The service calls sendPushNotification internally which is void and mocked implicitly via logger or no-op in the service code currently.
      // Ideally we would mock the private method or the internal dependency if it existed.
      // Since sendPushNotification just logs in the current implementation, we trust it runs without error.

      const result = await service.create(
        'user-id',
        NotificationType.ORDER_UPDATE,
        'Title',
        'Body',
      );

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.create).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(
        mockNotification,
      );
      mockPrismaService.notification.update.mockResolvedValue({
        ...mockNotification,
        isRead: true,
      });

      const result = await service.markAsRead('notif-id', 'user-id');

      expect(result.isRead).toBe(true);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('notif-id', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all as read', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-id');

      expect(result.success).toBe(true);
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-id', isRead: false },
        data: { isRead: true },
      });
    });
  });
});
