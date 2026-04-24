import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma';
import { EmailService } from '../../communication/email';
import {
  RegisterVendorDto,
  UpdateVendorDto,
  RequestWithdrawalDto,
  ProcessWithdrawalDto,
} from './dto';
import { VendorStatus, WithdrawalStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class VendorsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // ─── Vendor Registration ─────────────────────────────────────────────────────

  async register(dto: RegisterVendorDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Validate campus
    const campus = await this.prisma.campus.findUnique({
      where: { id: dto.campusId },
    });
    if (!campus) throw new BadRequestException('Invalid campus selected');

    // Validate categories
    const categories = await this.prisma.category.findMany({
      where: { id: { in: dto.categoryIds }, isActive: true },
    });
    if (categories.length !== dto.categoryIds.length) {
      throw new BadRequestException('One or more invalid categories selected');
    }

    // Validate preorder days
    if (
      (dto.saleType === 'PREORDER' || dto.saleType === 'BOTH') &&
      !dto.maxPreorderDays
    ) {
      throw new BadRequestException(
        'Max preorder days required for preorder sale type',
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user + vendor in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          campusId: dto.campusId,
          role: 'VENDOR',
        },
      });

      const vendor = await tx.vendor.create({
        data: {
          storeName: dto.storeName,
          phone: dto.phone,
          matricNumber: dto.matricNumber,
          studentIdUrl: dto.studentIdUrl,
          itemsSold: dto.itemsSold,
          saleType: dto.saleType,
          maxPreorderDays: dto.maxPreorderDays,
          status: 'PENDING',
          userId: user.id,
        },
      });

      // Create vendor category associations
      await tx.vendorCategory.createMany({
        data: dto.categoryIds.map((categoryId) => ({
          vendorId: vendor.id,
          categoryId,
        })),
      });

      return { user, vendor };
    });

    // Notify campus admins about new vendor registration
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', campusId: dto.campusId },
      select: { email: true, firstName: true },
    });

    // Send notification to admins (fire and forget)
    admins.forEach((admin) => {
      this.emailService
        .sendEmail({
          to: admin.email,
          subject: 'New Vendor Registration — Action Required',
          template: 'vendor-approved',
          context: {
            adminName: admin.firstName,
            vendorName: `${dto.firstName} ${dto.lastName}`,
            storeName: dto.storeName,
            dashboardUrl: `${process.env.FRONTEND_URL}/admin/vendors`,
          },
        })
        .catch(() => null);
    });

    return {
      message:
        'Registration submitted successfully. You will be notified once your account is approved.',
      vendorId: result.vendor.id,
    };
  }

  // ─── Get All Vendors ──────────────────────────────────────────────────────────

  async findAll(campusId?: string) {
    return this.prisma.vendor.findMany({
      where: {
        status: 'APPROVED',
        verificationStatus: 'APPROVED',
        ...(campusId && { user: { campusId } }),
      },
      select: {
        id: true,
        storeName: true,
        description: true,
        logo: true,
        rating: true,
        totalSales: true,
        saleType: true,
        itemsSold: true,
        vendorCategories: {
          select: {
            category: { select: { id: true, name: true, icon: true } },
          },
        },
        user: {
          select: { campusId: true, campus: { select: { name: true } } },
        },
      },
    });
  }

  // ─── Get Vendor by ID ─────────────────────────────────────────────────────────

  async findById(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        vendorCategories: {
          include: { category: true },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            campusId: true,
            campus: true,
          },
        },
        products: {
          where: { isActive: true },
          take: 20,
        },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  // ─── Get Current Vendor Profile ───────────────────────────────────────────────

  async getMyProfile(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      include: {
        vendorCategories: {
          include: { category: true },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            campusId: true,
            campus: true,
          },
        },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor profile not found');
    return vendor;
  }

  // ─── Update Vendor Profile ────────────────────────────────────────────────────

  async updateProfile(userId: string, dto: UpdateVendorDto) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    return this.prisma.vendor.update({
      where: { userId },
      data: {
        ...(dto.storeName && { storeName: dto.storeName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.logo !== undefined && { logo: dto.logo }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.itemsSold && { itemsSold: dto.itemsSold }),
        ...(dto.saleType && { saleType: dto.saleType }),
        ...(dto.maxPreorderDays !== undefined && {
          maxPreorderDays: dto.maxPreorderDays,
        }),
      },
    });
  }

  // ─── Get Pending Vendors (Admin) ──────────────────────────────────────────────

  async getPendingVendors(campusId?: string) {
    return this.prisma.vendor.findMany({
      where: {
        status: 'PENDING',
        ...(campusId && { user: { campusId } }),
      },
      include: {
        vendorCategories: { include: { category: true } },
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            campusId: true,
            campus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Approve/Reject Vendor (Admin) ────────────────────────────────────────────

  async verifyVendor(id: string, status: VendorStatus, reason?: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, firstName: true } },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const updated = await this.prisma.vendor.update({
      where: { id },
      data: {
        status,
        verificationStatus: status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      },
    });

    // Send email notification to vendor
    const subject =
      status === 'APPROVED'
        ? '🎉 Your Shopa Vendor Account is Approved!'
        : 'Shopa Vendor Application Update';

    const emailContext =
      status === 'APPROVED'
        ? {
            storeName: vendor.storeName,
            loginUrl: `${process.env.FRONTEND_URL}/vendor/login`,
          }
        : {
            storeName: vendor.storeName,
            reason: reason ?? 'Your application did not meet our requirements.',
          };

    this.emailService
      .sendEmail({
        to: vendor.user.email,
        subject,
        template: status === 'APPROVED' ? 'vendor-approved' : 'vendor-rejected',
        context: emailContext,
      })
      .catch(() => null);

    return updated;
  }

  // ─── Available Balance ────────────────────────────────────────────────────────

  async getAvailableBalance(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    // Calculate earnings from completed orders with no unresolved disputes
    // or where dispute window has expired
    const now = new Date();

    const completedOrders = await this.prisma.order.findMany({
      where: {
        vendorId: vendor.id,
        status: 'COMPLETED',
        OR: [
          // No disputes raised
          { disputes: { none: {} } },
          // Dispute window expired
          { disputeWindowExpiresAt: { lt: now } },
          // All disputes resolved in vendor's favour
          {
            disputes: {
              every: {
                status: { in: ['RESOLVED', 'CLOSED'] },
              },
            },
          },
        ],
      },
      select: { totalAmount: true },
    });

    const totalEarned = completedOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0,
    );

    // Subtract pending and approved withdrawals
    const pendingWithdrawals = await this.prisma.withdrawalRequest.aggregate({
      where: {
        vendorId: vendor.id,
        status: { in: ['PENDING', 'APPROVED'] },
      },
      _sum: { amount: true },
    });

    const pendingAmount = Number(pendingWithdrawals._sum.amount ?? 0);
    const availableBalance = Math.max(0, totalEarned - pendingAmount);

    return {
      availableBalance,
      totalEarned,
      totalWithdrawn: Number(vendor.totalWithdrawn),
      pendingWithdrawals: pendingAmount,
    };
  }

  // ─── Request Withdrawal ───────────────────────────────────────────────────────

  async requestWithdrawal(userId: string, dto: RequestWithdrawalDto) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    if (vendor.status !== 'APPROVED') {
      throw new ForbiddenException('Only approved vendors can request withdrawals');
    }

    // Check available balance
    const balance = await this.getAvailableBalance(userId);
    if (dto.amount > balance.availableBalance) {
      throw new BadRequestException(
        `Withdrawal amount exceeds available balance of ₦${balance.availableBalance.toLocaleString()}`,
      );
    }

    return this.prisma.withdrawalRequest.create({
      data: {
        amount: dto.amount,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        vendorId: vendor.id,
        status: 'PENDING',
      },
    });
  }

  // ─── Get Withdrawal History ───────────────────────────────────────────────────

  async getWithdrawalHistory(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    return this.prisma.withdrawalRequest.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Get All Withdrawals (Super Admin) ────────────────────────────────────────

  async getAllWithdrawals(status?: WithdrawalStatus) {
    return this.prisma.withdrawalRequest.findMany({
      where: status ? { status } : {},
      include: {
        vendor: {
          select: {
            storeName: true,
            user: { select: { email: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Process Withdrawal (Super Admin) ────────────────────────────────────────

  async processWithdrawal(
    id: string,
    adminId: string,
    dto: ProcessWithdrawalDto,
  ) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
      include: {
        vendor: {
          include: {
            user: { select: { email: true, firstName: true } },
          },
        },
      },
    });

    if (!withdrawal) throw new NotFoundException('Withdrawal request not found');
    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException('This withdrawal has already been processed');
    }

    const updated = await this.prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status: dto.status,
        note: dto.note,
        processedById: adminId,
        processedAt: new Date(),
      },
    });

    // Update vendor's totalWithdrawn if approved
    if (dto.status === 'APPROVED') {
      await this.prisma.vendor.update({
        where: { id: withdrawal.vendorId },
        data: {
          totalWithdrawn: {
            increment: withdrawal.amount,
          },
        },
      });
    }

    // Notify vendor by email
    this.emailService
      .sendEmail({
        to: withdrawal.vendor.user.email,
        subject:
          dto.status === 'APPROVED'
            ? '✅ Withdrawal Request Approved'
            : 'Withdrawal Request Update',
        template: 'withdrawal-update',
context: {
  approved: dto.status === 'APPROVED',
  amount: Number(withdrawal.amount).toLocaleString(),
  resolution: dto.note ?? '',
},
      })
      .catch(() => null);

    return updated;
  }
}