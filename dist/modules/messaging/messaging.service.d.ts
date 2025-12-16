import { PrismaService } from '../../prisma';
import { CreateConversationDto, SendMessageDto } from './dto';
export declare class MessagingService {
    private prisma;
    constructor(prisma: PrismaService);
    getOrCreateConversation(userId: string, dto: CreateConversationDto): Promise<{
        members: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            conversationId: string;
        })[];
    } & {
        id: string;
        lastMessageAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getUserConversations(userId: string): Promise<{
        unreadCount: number;
        lastMessage: {
            sender: {
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            conversationId: string;
            readAt: Date | null;
            content: string;
            senderId: string;
        };
        members: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            conversationId: string;
        })[];
        messages: ({
            sender: {
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            conversationId: string;
            readAt: Date | null;
            content: string;
            senderId: string;
        })[];
        id: string;
        lastMessageAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getConversationMessages(conversationId: string, userId: string, page?: number, limit?: number): Promise<({
        sender: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        conversationId: string;
        readAt: Date | null;
        content: string;
        senderId: string;
    })[]>;
    sendMessage(conversationId: string, senderId: string, dto: SendMessageDto): Promise<{
        sender: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        conversationId: string;
        readAt: Date | null;
        content: string;
        senderId: string;
    }>;
    getConversationById(conversationId: string, userId: string): Promise<{
        members: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            conversationId: string;
        })[];
    } & {
        id: string;
        lastMessageAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
    markMessagesAsRead(conversationId: string, userId: string): Promise<{
        success: boolean;
    }>;
}
