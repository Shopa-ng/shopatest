import { CreateConversationDto, SendMessageDto } from './dto';
import { MessagingService } from './messaging.service';
export declare class MessagingController {
    private readonly messagingService;
    constructor(messagingService: MessagingService);
    getConversations(userId: string): Promise<{
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
    createConversation(userId: string, dto: CreateConversationDto): Promise<{
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
    getConversation(id: string, userId: string): Promise<{
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
    getMessages(conversationId: string, userId: string, page?: number, limit?: number): Promise<({
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
    sendMessage(conversationId: string, userId: string, dto: SendMessageDto): Promise<{
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
    markAsRead(conversationId: string, userId: string): Promise<{
        success: boolean;
    }>;
}
