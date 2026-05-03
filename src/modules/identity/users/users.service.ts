import { Injectable, NotFoundException } from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma';
import { UpdateUserDto, UploadStudentIdDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isVerified: true,
        isEmailVerified: true,
        verificationStatus: true,
        campusId: true,
        campus: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
          },
        },
        vendor: {
          select: {
            id: true,
            storeName: true,
            verificationStatus: true,
          },
        },
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { campus, ...rest } = user;
    return {
      ...rest,
      campus,
      campusSuspended: campus ? !campus.isActive : false,
    };
  }

  async updateProfile(id: string, updateDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: updateDto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        campusId: true,
        updatedAt: true,
      },
    });
  }

  async uploadStudentId(id: string, uploadDto: UploadStudentIdDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        studentIdUrl: uploadDto.studentIdUrl,
        verificationStatus: VerificationStatus.PENDING,
      },
      select: {
        id: true,
        studentIdUrl: true,
        verificationStatus: true,
      },
    });
  }

  async findAdmins(campusId?: string) {
    const admins = await this.prisma.user.findMany({
      where: {
        role: 'ADMIN' as any,
        ...(campusId && { campusId }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        campus: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: admins,
    };
  }

  async toggleStatus(id: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, isActive: true },
    });

    return { success: true, data: updated };
  }

  async verifyUser(id: string, status: VerificationStatus) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        verificationStatus: status,
        isVerified: status === VerificationStatus.APPROVED,
      },
      select: {
        id: true,
        email: true,
        verificationStatus: true,
        isVerified: true,
      },
    });
  }

  async findStudents(campusId?: string) {
    const students = await this.prisma.user.findMany({
      where: {
        role: 'STUDENT' as any,
        ...(campusId && { campusId }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        campus: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: students,
    };
  }

  async findPendingVerifications(campusId?: string) {
    return this.prisma.user.findMany({
      where: {
        verificationStatus: VerificationStatus.PENDING,
        studentIdUrl: { not: null },
        ...(campusId && { campusId }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        studentIdUrl: true,
        campus: {
          select: {
            name: true,
          },
        },
        createdAt: true,
      },
    });
  }
} 