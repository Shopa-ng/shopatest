import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma';
import { EmailService } from '../../communication/email';
import { PushNotificationService } from '../../communication/push';
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
    private pushService: PushNotificationService,
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

    // Send pending-approval email to the vendor
    this.emailService
      .sendEmail({
        to: dto.email,
        subject: 'Your Shopa vendor application has been received',
        template: 'vendor-pending',
        context: {
          firstName: dto.firstName,
          storeName: dto.storeName,
        },
      })
      .catch(() => null);

    // Notify the campus admin (if one exists) about the new vendor application
    this.prisma.user
      .findFirst({
        where: { campusId: dto.campusId, role: 'ADMIN' },
        select: { id: true, email: true, firstName: true },
      })
      .then((admin) => {
        if (!admin) return;
        const categoryNames = categories.map((c) => c.name).join(', ');
        this.emailService
          .sendEmail({
            to: admin.email,
            subject: 'New vendor application on Shopa',
            template: 'order-status',
            context: {
              firstName: admin.firstName,
              orderNumber: result.vendor.id,
              status: 'NEW_VENDOR',
              statusMessage: `Hi ${admin.firstName}, a new vendor has applied to sell on ${campus.name}.\n\nVendor Details:\n• Store Name: ${dto.storeName}\n• Vendor Name: ${dto.firstName} ${dto.lastName}\n• Email: ${dto.email}\n• Categories: ${categoryNames}\n\nPlease log in to your admin dashboard to review and approve or reject this application.`,
            },
          })
          .catch(() => null);
        this.pushService
          .sendToUser(admin.id, {
            title: 'New Vendor Application',
            body: `${dto.storeName} has applied to sell on ${campus.name}. Review in your dashboard.`,
          })
          .catch(() => null);
      })
      .catch(() => null);

    return {
      message:
        'Registration submitted successfully. You will be notified once your account is approved.',
      vendorId: result.vendor.id,
    };
  }

  // ─── Get All Vendors ──────────────────────────────────────────────────────────

  async findAll(campusId?: string) {
    const vendors = await this.prisma.vendor.findMany({
      where: {
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
        status: true,
        verificationStatus: true,
        createdAt: true,
        vendorCategories: {
          select: {
            category: { select: { id: true, name: true, icon: true } },
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            campus: { select: { id: true, name: true } },
          },
        },
      },
    });

    return vendors.map(({ user, ...vendor }) => ({
      ...vendor,
      user: user ? { firstName: user.firstName, lastName: user.lastName, email: user.email } : null,
      campus: user?.campus ?? null,
    }));
  }

  // ─── Get Vendor by ID ─────────────────────────────────────────────────────────

  async findById(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        vendorCategories: {
          include: { category: { select: { id: true, name: true } } },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        products: {
          where: { isActive: true },
          select: { id: true, name: true, price: true, stock: true },
          take: 20,
        },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const { vendorCategories, matricNumber, studentIdUrl, bankName, accountNumber, accountName, ...rest } = vendor;
    return {
      ...rest,
      user: {
        ...vendor.user,
        matricNumber,
        studentIdUrl,
      },
      categories: vendorCategories.map((vc) => vc.category),
      bankAccount: bankName ? { bankName, accountNumber, accountName } : null,
    };
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

    const { bankName, accountNumber, accountName, availableBalance, totalWithdrawn, ...rest } = vendor;
    return {
      ...rest,
      availableBalance: Number(availableBalance ?? 0),
      totalWithdrawn: Number(totalWithdrawn ?? 0),
      bankAccount: bankName ? { bankName, accountNumber, accountName } : null,
    };
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
        ...(dto.bankAccount && {
          bankName: dto.bankAccount.bankName,
          accountNumber: dto.bankAccount.accountNumber,
          accountName: dto.bankAccount.accountName,
        }),
      },
    });
  }

  // ─── Get Pending Vendors (Admin) ──────────────────────────────────────────────

  async getPendingVendors(campusId?: string) {
    const vendors = await this.prisma.vendor.findMany({
      where: {
        status: 'PENDING',
        ...(campusId && { user: { campusId } }),
      },
      include: {
        vendorCategories: {
          include: { category: { select: { id: true, name: true } } },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            campusId: true,
            campus: true,
          },
        },
        products: {
          where: { isActive: true },
          select: { id: true, name: true, price: true, stock: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return vendors.map(({ vendorCategories, matricNumber, studentIdUrl, ...rest }) => ({
      ...rest,
      user: {
        ...rest.user,
        matricNumber,
        studentIdUrl,
      },
      categories: vendorCategories.map((vc) => vc.category),
    }));
  }

  // ─── Approve/Reject Vendor (Admin) ────────────────────────────────────────────

  async verifyVendor(id: string, status: VendorStatus, reason?: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true } },
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
    if (status === 'APPROVED') {
      this.emailService
        .sendEmail({
          to: vendor.user.email,
          subject: 'Your Shopa vendor application has been approved!',
          template: 'vendor-approved',
          context: {
            firstName: vendor.user.firstName,
            storeName: vendor.storeName,
            loginUrl: `${process.env.FRONTEND_URL}/vendor/login`,
          },
        })
        .catch(() => null);
      this.pushService
        .sendToUser(vendor.user.id, {
          title: 'Application Approved!',
          body: 'Congratulations! Your vendor application has been approved. Start listing products.',
        })
        .catch(() => null);
    } else {
      this.emailService
        .sendEmail({
          to: vendor.user.email,
          subject: 'Your Shopa vendor application was not approved',
          template: 'vendor-rejected',
          context: {
            firstName: vendor.user.firstName,
            storeName: vendor.storeName,
            reason: reason ?? 'Your application did not meet our requirements.',
          },
        })
        .catch(() => null);
      this.pushService
        .sendToUser(vendor.user.id, {
          title: 'Application Not Approved',
          body: 'Your vendor application was not approved. Contact support for more information.',
        })
        .catch(() => null);
    }

    return updated;
  }

  // ─── Balance ──────────────────────────────────────────────────────────────────

  async getBalance(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const now = new Date();
    const vendorId = vendor.id;
    const FEE = 0.925;

    const [allDelivered, pendingWithdrawalsAgg] = await Promise.all([
      // Every delivered/completed order with its dispute state
      this.prisma.order.findMany({
        where: { vendorId, status: { in: ['DELIVERED', 'COMPLETED'] } },
        select: {
          totalAmount: true,
          disputeWindowExpiresAt: true,
          refundStatus: true,
          disputes: { select: { status: true } },
        },
      }),
      this.prisma.withdrawalRequest.aggregate({
        where: { vendorId, status: { in: ['PENDING', 'APPROVED'] } },
        _sum: { amount: true },
      }),
    ]);

    const totalWithdrawn = Number(vendor.totalWithdrawn ?? 0);
    const pendingWithdrawals = Number(pendingWithdrawalsAgg._sum.amount ?? 0);

    let availableBalance = 0;
    let withdrawableBalance = 0;

    for (const order of allDelivered) {
      const earned = Number(order.totalAmount) * FEE;
      const disputeStatuses = order.disputes.map((d) => d.status);
      const hasActiveDispute = disputeStatuses.some((s) =>
        ['OPEN', 'VENDOR_RESPONDED'].includes(s),
      );
      const hasResolvedNoRefund =
        disputeStatuses.includes('RESOLVED') &&
        order.refundStatus !== 'PENDING_REFUND';
      const isRefunded = order.refundStatus === 'PENDING_REFUND';
      const windowExpired =
        order.disputeWindowExpiresAt != null &&
        order.disputeWindowExpiresAt <= now;
      const noDisputeRaised = order.disputes.length === 0;

      if (isRefunded) {
        // Vendor loses this money — excluded from both balances
        continue;
      }

      availableBalance += earned;

      if (hasResolvedNoRefund) {
        // Dispute closed in vendor's favour — immediately withdrawable regardless of window
        withdrawableBalance += earned;
      } else if (noDisputeRaised && windowExpired) {
        // 24hr window passed with no dispute raised — immediately withdrawable
        withdrawableBalance += earned;
      }
      // else: active/pending dispute, or still within the 24hr window
    }

    withdrawableBalance = Math.max(0, withdrawableBalance - pendingWithdrawals);

    return {
      availableBalance,
      withdrawableBalance,
      totalEarned: availableBalance + totalWithdrawn,
      totalWithdrawn,
      pendingWithdrawals,
    };
  }

  // kept for internal callers that still reference the old name
  async getAvailableBalance(userId: string) {
    return this.getBalance(userId);
  }

  // ─── Request Withdrawal ───────────────────────────────────────────────────────

  async requestWithdrawal(userId: string, dto: RequestWithdrawalDto) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    if (vendor.status !== 'APPROVED') {
      throw new ForbiddenException('Only approved vendors can request withdrawals');
    }

    // Validate against withdrawable (liquid) balance
    const balance = await this.getBalance(userId);
    if (dto.amount > balance.withdrawableBalance) {
      throw new BadRequestException(
        `Withdrawal amount exceeds withdrawable balance of ₦${balance.withdrawableBalance.toLocaleString()}`,
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