import { OrderStatus } from '@prisma/client';
export declare class OrderItemDto {
    productId: string;
    quantity: number;
}
export declare class CreateOrderDto {
    items: OrderItemDto[];
    deliveryAddress?: string;
    deliveryMethod?: string;
    notes?: string;
}
export declare class UpdateOrderStatusDto {
    status: OrderStatus;
}
