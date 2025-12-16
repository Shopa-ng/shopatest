import { DisputesService } from './disputes.service';
import { CreateDisputeDto, ResolveDisputeDto } from './dto';
import { DisputeStatus } from '@prisma/client';
export declare class DisputesController {
    private readonly disputesService;
    constructor(disputesService: DisputesService);
    getMyDisputes(userId: string): Promise<({
        order: {
            orderNumber: string;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
        };
    } & {
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.DisputeStatus;
        orderId: string;
        reason: string;
        resolution: string | null;
        raisedById: string;
        resolvedById: string | null;
    })[]>;
    findAll(status?: DisputeStatus): Promise<({
        order: {
            vendor: {
                storeName: string;
            };
            orderNumber: string;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            buyer: {
                firstName: string;
                lastName: string;
            };
        };
        raisedBy: {
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.DisputeStatus;
        orderId: string;
        reason: string;
        resolution: string | null;
        raisedById: string;
        resolvedById: string | null;
    })[]>;
    findById(id: string): Promise<{
        order: {
            vendor: {
                user: {
                    email: string;
                    firstName: string;
                    lastName: string;
                };
                storeName: string;
            };
            payment: {
                status: import(".prisma/client").$Enums.PaymentStatus;
                amount: import("@prisma/client/runtime/library").Decimal;
            } | null;
            orderItems: ({
                product: {
                    name: string;
                    images: string[];
                };
            } & {
                id: string;
                createdAt: Date;
                price: import("@prisma/client/runtime/library").Decimal;
                productId: string;
                quantity: number;
                orderId: string;
            })[];
            buyer: {
                email: string;
                firstName: string;
                lastName: string;
                phone: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.OrderStatus;
            vendorId: string;
            deliveryAddress: string | null;
            deliveryMethod: string | null;
            notes: string | null;
            orderNumber: string;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            buyerId: string;
        };
        raisedBy: {
            email: string;
            firstName: string;
            lastName: string;
        };
        resolvedBy: {
            firstName: string;
            lastName: string;
        } | null;
    } & {
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.DisputeStatus;
        orderId: string;
        reason: string;
        resolution: string | null;
        raisedById: string;
        resolvedById: string | null;
    }>;
    create(userId: string, createDto: CreateDisputeDto): Promise<{
        order: {
            orderNumber: string;
        };
        raisedBy: {
            firstName: string;
            lastName: string;
        };
    } & {
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.DisputeStatus;
        orderId: string;
        reason: string;
        resolution: string | null;
        raisedById: string;
        resolvedById: string | null;
    }>;
    resolve(id: string, adminId: string, resolveDto: ResolveDisputeDto): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.DisputeStatus;
        orderId: string;
        reason: string;
        resolution: string | null;
        raisedById: string;
        resolvedById: string | null;
    }>;
}
