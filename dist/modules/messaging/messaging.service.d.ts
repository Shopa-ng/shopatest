import { PrismaService } from '../../prisma';
import { CreateConversationDto, SendMessageDto } from './dto';
export declare class MessagingService {
    private prisma;
    constructor(prisma: PrismaService);
    getOrCreateConversation(userId: string, dto: CreateConversationDto): Promise<{
        members: ({
            user: {
                firstName: string;
                lastName: string;
                id: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            conversationId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        lastMessageAt: Date;
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
            content: string;
            conversationId: string;
            readAt: Date | null;
            senderId: string;
        };
        members: ({
            user: {
                firstName: string;
                lastName: string;
                id: string;
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
            content: string;
            conversationId: string;
            readAt: Date | null;
            senderId: string;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        lastMessageAt: Date;
    }[]>;
    getConversationMessages(conversationId: string, userId: string, page?: number, limit?: number): Promise<({
        sender: {
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        createdAt: Date;
        content: string;
        conversationId: string;
        readAt: Date | null;
        senderId: string;
    })[]>;
    sendMessage(conversationId: string, senderId: string, dto: SendMessageDto): Promise<{
        sender: {
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        createdAt: Date;
        content: string;
        conversationId: string;
        readAt: Date | null;
        senderId: string;
    }>;
    getConversationById(conversationId: string, userId: string): Promise<{
        members: ({
            user: {
                firstName: string;
                lastName: string;
                id: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            conversationId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        lastMessageAt: Date;
    }>;
    markMessagesAsRead(conversationId: string, userId: string): Promise<{
        success: boolean;
    }>;
}
