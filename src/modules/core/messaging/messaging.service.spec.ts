import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma';
import { MessagingService } from './messaging.service';

describe('MessagingService', () => {
  let service: MessagingService;

  const mockUser = { id: 'user-id', firstName: 'John', lastName: 'Doe' };
  const mockConversation = {
    id: 'conv-id',
    members: [{ userId: 'user-id', user: mockUser }],
  };
  const mockMessage = {
    id: 'msg-id',
    content: 'Hello',
    createdAt: new Date(),
    senderId: 'user-id',
  };

  const mockPrismaService = {
    conversation: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    conversationMember: {
      findFirst: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateConversation', () => {
    it('should return existing conversation if found', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(
        mockConversation,
      );

      const result = await service.getOrCreateConversation('user-id', {
        participantId: 'other-id',
      });

      expect(result).toEqual(mockConversation);
      expect(mockPrismaService.conversation.create).not.toHaveBeenCalled();
    });

    it('should create new conversation if not found', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(null);
      mockPrismaService.conversation.create.mockResolvedValue(mockConversation);

      const result = await service.getOrCreateConversation('user-id', {
        participantId: 'other-id',
      });

      expect(result).toEqual(mockConversation);
      expect(mockPrismaService.conversation.create).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should send a message via transaction', async () => {
      mockPrismaService.conversationMember.findFirst.mockResolvedValue({
        id: 'member-id',
      });
      mockPrismaService.message.create.mockResolvedValue(mockMessage);
      mockPrismaService.conversation.update.mockResolvedValue(mockConversation);

      const result = await service.sendMessage('conv-id', 'user-id', {
        content: 'Hello',
      });

      expect(result).toEqual(mockMessage);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.message.create).toHaveBeenCalled();
      expect(mockPrismaService.conversation.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user not member', async () => {
      mockPrismaService.conversationMember.findFirst.mockResolvedValue(null);

      await expect(
        service.sendMessage('conv-id', 'user-id', { content: 'Hello' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getConversationMessages', () => {
    it('should return messages and mark as read', async () => {
      mockPrismaService.conversationMember.findFirst.mockResolvedValue({
        id: 'member-id',
      });
      mockPrismaService.message.findMany.mockResolvedValue([mockMessage]);

      const result = await service.getConversationMessages(
        'conv-id',
        'user-id',
      );

      expect(result).toEqual([mockMessage]);
      expect(mockPrismaService.message.updateMany).toHaveBeenCalled();
    });
  });
});
