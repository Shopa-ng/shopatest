"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../prisma");
let MessagingService = class MessagingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOrCreateConversation(userId, dto) {
        const { participantId } = dto;
        const existingConversation = await this.prisma.conversation.findFirst({
            where: {
                AND: [
                    { members: { some: { userId } } },
                    { members: { some: { userId: participantId } } },
                ],
            },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true } },
                    },
                },
            },
        });
        if (existingConversation) {
            return existingConversation;
        }
        return this.prisma.conversation.create({
            data: {
                members: {
                    create: [{ userId }, { userId: participantId }],
                },
            },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true } },
                    },
                },
            },
        });
    }
    async getUserConversations(userId) {
        const conversations = await this.prisma.conversation.findMany({
            where: {
                members: { some: { userId } },
            },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true } },
                    },
                },
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        sender: { select: { firstName: true, lastName: true } },
                    },
                },
            },
            orderBy: { lastMessageAt: 'desc' },
        });
        const conversationsWithUnread = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await this.prisma.message.count({
                where: {
                    conversationId: conv.id,
                    senderId: { not: userId },
                    readAt: null,
                },
            });
            return {
                ...conv,
                unreadCount,
                lastMessage: conv.messages[0] || null,
            };
        }));
        return conversationsWithUnread;
    }
    async getConversationMessages(conversationId, userId, page = 1, limit = 50) {
        const membership = await this.prisma.conversationMember.findFirst({
            where: { conversationId, userId },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('You are not a member of this conversation');
        }
        const messages = await this.prisma.message.findMany({
            where: { conversationId },
            include: {
                sender: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });
        await this.prisma.message.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                readAt: null,
            },
            data: { readAt: new Date() },
        });
        return messages.reverse();
    }
    async sendMessage(conversationId, senderId, dto) {
        const membership = await this.prisma.conversationMember.findFirst({
            where: { conversationId, userId: senderId },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('You are not a member of this conversation');
        }
        const [message] = await this.prisma.$transaction([
            this.prisma.message.create({
                data: {
                    conversationId,
                    senderId,
                    content: dto.content,
                },
                include: {
                    sender: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
            this.prisma.conversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: new Date() },
            }),
        ]);
        return message;
    }
    async getConversationById(conversationId, userId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true } },
                    },
                },
            },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const isMember = conversation.members.some((m) => m.userId === userId);
        if (!isMember) {
            throw new common_1.ForbiddenException('You are not a member of this conversation');
        }
        return conversation;
    }
    async markMessagesAsRead(conversationId, userId) {
        await this.prisma.message.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                readAt: null,
            },
            data: { readAt: new Date() },
        });
        return { success: true };
    }
};
exports.MessagingService = MessagingService;
exports.MessagingService = MessagingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], MessagingService);
//# sourceMappingURL=messaging.service.js.map