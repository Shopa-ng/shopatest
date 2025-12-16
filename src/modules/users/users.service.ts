import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { UpdateUserDto, UploadStudentIdDto } from './dto';
import { VerificationStatus } from '@prisma/client';

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

    return user;
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
