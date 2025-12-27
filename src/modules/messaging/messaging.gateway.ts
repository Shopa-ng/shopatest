import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagingService } from './messaging.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private connectedUsers = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private messagingService: MessagingService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;

      // Store connection
      this.connectedUsers.set(payload.sub, client.id);

      // Join user's conversation rooms
      const conversations = await this.messagingService.getUserConversations(
        payload.sub,
      );
      conversations.forEach((conv) => {
        client.join(`conversation:${conv.id}`);
      });

      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);
    } catch (error) {
      this.logger.error('Authentication failed', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const message = await this.messagingService.sendMessage(
        data.conversationId,
        client.userId,
        { content: data.content },
      );

      // Emit to all users in the conversation
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('message:new', {
          conversationId: data.conversationId,
          message,
        });

      return { success: true, message };
    } catch (error) {
      this.logger.error('Failed to send message', error);
      return { error: error.message };
    }
  }

  @SubscribeMessage('message:read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      await this.messagingService.markMessagesAsRead(
        data.conversationId,
        client.userId,
      );

      // Notify other participants that messages were read
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('message:read', {
          conversationId: data.conversationId,
          readBy: client.userId,
          readAt: new Date(),
        });

      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      // Verify user is a member before joining
      await this.messagingService.getConversationById(
        data.conversationId,
        client.userId,
      );
      client.join(`conversation:${data.conversationId}`);
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;

    client.to(`conversation:${data.conversationId}`).emit('typing:start', {
      conversationId: data.conversationId,
      userId: client.userId,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;

    client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      conversationId: data.conversationId,
      userId: client.userId,
    });
  }

  // Utility method to send notification to specific user
  sendToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }
}
