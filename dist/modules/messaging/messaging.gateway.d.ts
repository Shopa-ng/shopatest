import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagingService } from './messaging.service';
interface AuthenticatedSocket extends Socket {
    userId?: string;
}
export declare class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private messagingService;
    server: Server;
    private readonly logger;
    private connectedUsers;
    constructor(jwtService: JwtService, messagingService: MessagingService);
    handleConnection(client: AuthenticatedSocket): Promise<void>;
    handleDisconnect(client: AuthenticatedSocket): void;
    handleSendMessage(client: AuthenticatedSocket, data: {
        conversationId: string;
        content: string;
    }): Promise<{
        success: boolean;
        message: {
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
        };
        error?: undefined;
    } | {
        error: any;
        success?: undefined;
        message?: undefined;
    }>;
    handleMarkRead(client: AuthenticatedSocket, data: {
        conversationId: string;
    }): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        error: any;
        success?: undefined;
    }>;
    handleJoinConversation(client: AuthenticatedSocket, data: {
        conversationId: string;
    }): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        error: any;
        success?: undefined;
    }>;
    handleTypingStart(client: AuthenticatedSocket, data: {
        conversationId: string;
    }): void;
    handleTypingStop(client: AuthenticatedSocket, data: {
        conversationId: string;
    }): void;
    sendToUser(userId: string, event: string, data: any): void;
}
export {};
