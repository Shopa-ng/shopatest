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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MessagingGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingGateway = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const messaging_service_1 = require("./messaging.service");
let MessagingGateway = MessagingGateway_1 = class MessagingGateway {
    constructor(jwtService, messagingService) {
        this.jwtService = jwtService;
        this.messagingService = messagingService;
        this.logger = new common_1.Logger(MessagingGateway_1.name);
        this.connectedUsers = new Map();
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.split(' ')[1];
            if (!token) {
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token);
            client.userId = payload.sub;
            this.connectedUsers.set(payload.sub, client.id);
            const conversations = await this.messagingService.getUserConversations(payload.sub);
            conversations.forEach((conv) => {
                client.join(`conversation:${conv.id}`);
            });
            this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);
        }
        catch (error) {
            this.logger.error('Authentication failed', error);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        if (client.userId) {
            this.connectedUsers.delete(client.userId);
        }
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    async handleSendMessage(client, data) {
        if (!client.userId) {
            return { error: 'Unauthorized' };
        }
        try {
            const message = await this.messagingService.sendMessage(data.conversationId, client.userId, { content: data.content });
            this.server
                .to(`conversation:${data.conversationId}`)
                .emit('message:new', {
                conversationId: data.conversationId,
                message,
            });
            return { success: true, message };
        }
        catch (error) {
            this.logger.error('Failed to send message', error);
            return { error: error.message };
        }
    }
    async handleMarkRead(client, data) {
        if (!client.userId) {
            return { error: 'Unauthorized' };
        }
        try {
            await this.messagingService.markMessagesAsRead(data.conversationId, client.userId);
            this.server
                .to(`conversation:${data.conversationId}`)
                .emit('message:read', {
                conversationId: data.conversationId,
                readBy: client.userId,
                readAt: new Date(),
            });
            return { success: true };
        }
        catch (error) {
            return { error: error.message };
        }
    }
    async handleJoinConversation(client, data) {
        if (!client.userId) {
            return { error: 'Unauthorized' };
        }
        try {
            await this.messagingService.getConversationById(data.conversationId, client.userId);
            client.join(`conversation:${data.conversationId}`);
            return { success: true };
        }
        catch (error) {
            return { error: error.message };
        }
    }
    handleTypingStart(client, data) {
        if (!client.userId)
            return;
        client.to(`conversation:${data.conversationId}`).emit('typing:start', {
            conversationId: data.conversationId,
            userId: client.userId,
        });
    }
    handleTypingStop(client, data) {
        if (!client.userId)
            return;
        client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
            conversationId: data.conversationId,
            userId: client.userId,
        });
    }
    sendToUser(userId, event, data) {
        const socketId = this.connectedUsers.get(userId);
        if (socketId) {
            this.server.to(socketId).emit(event, data);
        }
    }
};
exports.MessagingGateway = MessagingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], MessagingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('message:send'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MessagingGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message:read'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MessagingGateway.prototype, "handleMarkRead", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('conversation:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MessagingGateway.prototype, "handleJoinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing:start'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MessagingGateway.prototype, "handleTypingStart", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing:stop'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MessagingGateway.prototype, "handleTypingStop", null);
exports.MessagingGateway = MessagingGateway = MessagingGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
            credentials: true,
        },
        namespace: '/chat',
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        messaging_service_1.MessagingService])
], MessagingGateway);
//# sourceMappingURL=messaging.gateway.js.map