import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma';
import { InitializePaymentDto, PaystackWebhookDto } from './dto';
import { Prisma } from '@prisma/client';
export declare class PaymentsService {
    private prisma;
    private configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    initializePayment(userId: string, dto: InitializePaymentDto): Promise<{
        authorizationUrl: any;
        reference: any;
        accessCode: any;
    }>;
    handlePaystackWebhook(body: PaystackWebhookDto, signature: string): Promise<{
        received: boolean;
    }>;
    private handleSuccessfulPayment;
    verifyPayment(reference: string): Promise<{
        verified: boolean;
        status: any;
    }>;
    releaseEscrow(orderId: string): Promise<{
        released: boolean;
    }>;
    refundPayment(orderId: string, adminId: string): Promise<{
        refunded: boolean;
    }>;
    getPaymentStatus(orderId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
        provider: string;
        reference: string;
        providerReference: string | null;
        escrowReleaseDate: Date | null;
        metadata: Prisma.JsonValue | null;
        orderId: string;
    } | null>;
}
