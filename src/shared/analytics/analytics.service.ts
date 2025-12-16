import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export interface VendorAnalytics {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  releasedRevenue: number;
  pendingRevenue: number;
  totalProducts: number;
  activeProducts: number;
  averageRating: number;
  totalReviews: number;
  recentOrders: any[];
  topProducts: any[];
  salesTrend: { date: string; amount: number }[];
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getVendorAnalytics(vendorUserId: string): Promise<VendorAnalytics> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: vendorUserId },
    });

    if (!vendor) {
      throw new ForbiddenException('Vendor profile not found');
    }

    const vendorId = vendor.id;

    // Order counts
    const [totalOrders, completedOrders, pendingOrders, cancelledOrders] =
      await Promise.all([
        this.prisma.order.count({ where: { vendorId } }),
        this.prisma.order.count({
          where: { vendorId, status: OrderStatus.COMPLETED },
        }),
        this.prisma.order.count({
          where: {
            vendorId,
            status: {
              in: [
                OrderStatus.PENDING,
                OrderStatus.PAID,
                OrderStatus.CONFIRMED,
              ],
            },
          },
        }),
        this.prisma.order.count({
          where: { vendorId, status: OrderStatus.CANCELLED },
        }),
      ]);

    // Revenue calculations
    const payments = await this.prisma.payment.findMany({
      where: {
        order: { vendorId },
        status: { in: [PaymentStatus.HELD, PaymentStatus.RELEASED] },
      },
      select: { amount: true, status: true },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const releasedRevenue = payments
      .filter((p) => p.status === PaymentStatus.RELEASED)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingRevenue = payments
      .filter((p) => p.status === PaymentStatus.HELD)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Product counts
    const [totalProducts, activeProducts] = await Promise.all([
      this.prisma.product.count({ where: { vendorId } }),
      this.prisma.product.count({ where: { vendorId, isActive: true } }),
    ]);

    // Reviews and rating
    const reviews = await this.prisma.review.findMany({
      where: { vendorId },
      select: { rating: true },
    });
    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    // Recent orders
    const recentOrders = await this.prisma.order.findMany({
      where: { vendorId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { firstName: true, lastName: true } },
        payment: { select: { status: true } },
      },
    });

    // Top products by orders
    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { vendorId } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const topProductDetails = await this.prisma.product.findMany({
      where: { id: { in: topProducts.map((p) => p.productId) } },
      select: { id: true, name: true, images: true, price: true },
    });

    const topProductsWithQuantity = topProducts.map((tp) => ({
      ...topProductDetails.find((p) => p.id === tp.productId),
      totalSold: tp._sum.quantity,
    }));

    // Sales trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentPayments = await this.prisma.payment.findMany({
      where: {
        order: { vendorId },
        status: { in: [PaymentStatus.HELD, PaymentStatus.RELEASED] },
        createdAt: { gte: sevenDaysAgo },
      },
      select: { amount: true, createdAt: true },
    });

    const salesByDate = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      salesByDate.set(date.toISOString().split('T')[0], 0);
    }

    recentPayments.forEach((p) => {
      const dateKey = p.createdAt.toISOString().split('T')[0];
      if (salesByDate.has(dateKey)) {
        salesByDate.set(dateKey, salesByDate.get(dateKey)! + Number(p.amount));
      }
    });

    const salesTrend = Array.from(salesByDate.entries()).map(
      ([date, amount]) => ({ date, amount }),
    );

    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      totalRevenue,
      releasedRevenue,
      pendingRevenue,
      totalProducts,
      activeProducts,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      recentOrders,
      topProducts: topProductsWithQuantity,
      salesTrend,
    };
  }

  async getAdminDashboard() {
    const [
      totalUsers,
      totalVendors,
      pendingVendorVerifications,
      totalProducts,
      totalOrders,
      pendingDisputes,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.vendor.count(),
      this.prisma.vendor.count({
        where: { verificationStatus: 'PENDING' },
      }),
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.dispute.count({
        where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      }),
      this.prisma.payment
        .aggregate({
          where: { status: { in: ['HELD', 'RELEASED'] } },
          _sum: { amount: true },
        })
        .then((r) => Number(r._sum.amount || 0)),
    ]);

    // Recent activity
    const recentOrders = await this.prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { firstName: true, lastName: true } },
        vendor: { select: { storeName: true } },
      },
    });

    const recentUsers = await this.prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return {
      stats: {
        totalUsers,
        totalVendors,
        pendingVendorVerifications,
        totalProducts,
        totalOrders,
        pendingDisputes,
        totalRevenue,
      },
      recentOrders,
      recentUsers,
    };
  }
}
