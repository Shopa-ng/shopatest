import { DisputeStatus } from '@prisma/client';
export declare class CreateDisputeDto {
    orderId: string;
    reason: string;
    description?: string;
}
export declare class ResolveDisputeDto {
    status: DisputeStatus;
    resolution: string;
}
