export declare class CreateConversationDto {
    participantId: string;
}
export declare class SendMessageDto {
    content: string;
}
export declare class MessageResponseDto {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    createdAt: Date;
    readAt?: Date;
}
export declare class ConversationResponseDto {
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
