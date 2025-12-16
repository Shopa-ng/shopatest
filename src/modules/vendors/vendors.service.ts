import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma';
import { ApplyVendorDto, UpdateVendorDto } from './dto';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async apply(userId: string, applyDto: ApplyVendorDto) {
    // Check if user already has a vendor profile
    const existingVendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });

    if (existingVendor) {
      throw new ConflictException('You already have a vendor profile');
    }

    // Create vendor profile
    const vendor = await this.prisma.vendor.create({
      data: {
        userId,
        ...applyDto,
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update user role to VENDOR
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.VENDOR },
    });

    return vendor;
  }

  async findAll(campusId?: string, verifiedOnly = true) {
    return this.prisma.vendor.findMany({
      where: {
        ...(verifiedOnly && {
          verificationStatus: VerificationStatus.APPROVED,
        }),
        ...(campusId && {
          user: { campusId },
        }),
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            campus: { select: { name: true } },
          },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { rating: 'desc' },
    });
  }

  async findById(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            campus: { select: { name: true, code: true } },
          },
        },
        products: {
          where: { isActive: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { products: true, orders: true },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  async getMyVendorProfile(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      include: {
        _count: {
          select: { products: true, orders: true },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    return vendor;
  }

  async update(userId: string, updateDto: UpdateVendorDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    return this.prisma.vendor.update({
      where: { userId },
      data: updateDto,
    });
  }

  async verify(id: string, status: VerificationStatus) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.prisma.vendor.update({
      where: { id },
      data: { verificationStatus: status },
    });
  }

  async findPendingVerifications() {
    return this.prisma.vendor.findMany({
      where: { verificationStatus: VerificationStatus.PENDING },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            studentIdUrl: true,
            campus: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
