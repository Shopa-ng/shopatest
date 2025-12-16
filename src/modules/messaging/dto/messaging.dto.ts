import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ description: 'User ID to start conversation with' })
  @IsUUID()
  participantId: string;
}

export class SendMessageDto {
  @ApiProperty({ example: 'Hello! Is the product still available?' })
  @IsString()
  content: string;
}

export class MessageResponseDto {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: Date;
  readAt?: Date;
}

export class ConversationResponseDto {
  id: string;
  participants: {
    id: string;
    firstName: string;
    lastName: string;
  }[];
  lastMessage?: MessageResponseDto;
  unreadCount: number;
  updatedAt: Date;
}
