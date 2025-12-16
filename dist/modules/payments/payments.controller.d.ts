import { PaymentsService } from './payments.service';
import { InitializePaymentDto, PaystackWebhookDto } from './dto';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    initialize(userId: string, dto: InitializePaymentDto): Promise<{
        authorizationUrl: any;
        reference: any;
        accessCode: any;
    }>;
    paystackWebhook(body: PaystackWebhookDto, signature: string): Promise<{
        received: boolean;
    }>;
    verify(reference: string): Promise<{
        verified: boolean;
        status: any;
    }>;
    getStatus(orderId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PaymentStatus;
        amount: import("@prisma/client/runtime/library").Decimal;
        provider: string;
        reference: string;
        providerReference: string | null;
        escrowReleaseDate: Date | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        orderId: string;
    } | null>;
    releaseEscrow(orderId: string): Promise<{
        released: boolean;
    }>;
    refund(orderId: string, adminId: string): Promise<{
        refunded: boolean;
    }>;
}
