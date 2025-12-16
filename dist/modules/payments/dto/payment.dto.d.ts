export declare class InitializePaymentDto {
    orderId: string;
}
export declare class PaystackWebhookDto {
    event: string;
    data: {
        reference: string;
        status: string;
        amount: number;
        customer: {
            email: string;
        };
        metadata?: Record<string, any>;
    };
}
export declare class PaymentResponseDto {
    authorizationUrl: string;
    reference: string;
    accessCode: string;
}
