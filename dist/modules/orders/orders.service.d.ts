import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';
export declare class OrdersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(buyerId: string, createDto: CreateOrderDto): Promise<{
        vendor: {
            storeName: string;
        };
        orderItems: ({
            product: {
                name: string;
                images: string[];
            };
        } & {
            id: string;
            createdAt: Date;
            price: Prisma.Decimal;
            productId: string;
            quantity: number;
            orderId: string;
        })[];
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
        totalAmount: Prisma.Decimal;
        buyerId: string;
    }>;
    findByBuyer(buyerId: string): Promise<({
        vendor: {
            storeName: string;
        };
        payment: {
            status: import(".prisma/client").$Enums.PaymentStatus;
        } | null;
        orderItems: ({
            product: {
                name: string;
                images: string[];
            };
        } & {
            id: string;
            createdAt: Date;
            price: Prisma.Decimal;
            productId: string;
            quantity: number;
            orderId: string;
        })[];
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
        totalAmount: Prisma.Decimal;
        buyerId: string;
    })[]>;
    findByVendor(vendorUserId: string): Promise<({
        payment: {
            status: import(".prisma/client").$Enums.PaymentStatus;
        } | null;
        orderItems: ({
            product: {
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            price: Prisma.Decimal;
            productId: string;
            quantity: number;
            orderId: string;
        })[];
        buyer: {
            firstName: string;
            lastName: string;
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
        totalAmount: Prisma.Decimal;
        buyerId: string;
    })[]>;
    findById(id: string, userId: string): Promise<{
        vendor: {
            user: {
                firstName: string;
                phone: string | null;
            };
            id: string;
            userId: string;
            storeName: string;
        };
        payment: {
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
        } | null;
        orderItems: ({
            product: {
                name: string;
                description: string | null;
                campusId: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                isActive: boolean;
                price: Prisma.Decimal;
                stock: number;
                images: string[];
                vendorId: string;
                categoryId: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            price: Prisma.Decimal;
            productId: string;
            quantity: number;
            orderId: string;
        })[];
        buyer: {
            firstName: string;
            lastName: string;
            phone: string | null;
            id: string;
        };
        disputes: {
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
        }[];
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
        totalAmount: Prisma.Decimal;
        buyerId: string;
    }>;
    updateStatus(id: string, userId: string, updateDto: UpdateOrderStatusDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        vendorId: string;
        deliveryAddress: string | null;
        deliveryMethod: string | null;
        notes: string | null;
        orderNumber: string;
        totalAmount: Prisma.Decimal;
        buyerId: string;
    }>;
    confirmDelivery(id: string, buyerId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        vendorId: string;
        deliveryAddress: string | null;
        deliveryMethod: string | null;
        notes: string | null;
        orderNumber: string;
        totalAmount: Prisma.Decimal;
        buyerId: string;
    }>;
}
