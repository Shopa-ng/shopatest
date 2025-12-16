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
    createConversation(userId: string, dto: CreateConversationDto): Promise<{
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
    getConversation(id: string, userId: string): Promise<{
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
    getMessages(conversationId: string, userId: string, page?: number, limit?: number): Promise<({
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
    sendMessage(conversationId: string, userId: string, dto: SendMessageDto): Promise<{
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
    markAsRead(conversationId: string, userId: string): Promise<{
        success: boolean;
    }>;
}
