import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma';
import { CreateCampusDto, UpdateCampusDto } from './dto';

@Injectable()
export class CampusService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateCampusDto) {
    const existing = await this.prisma.campus.findFirst({
      where: {
        OR: [{ name: createDto.name }, { code: createDto.code }],
      },
    });

    if (existing) {
      throw new ConflictException(
        'Campus with this name or code already exists',
      );
    }

    return this.prisma.campus.create({
      data: createDto,
    });
  }

  async findAll(activeOnly = true) {
    const campuses = await this.prisma.campus.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    // Derive vendor/student counts from a single users count query per campus
    const campusIds = campuses.map((c) => c.id);
    const [vendorCounts, studentCounts] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['campusId'],
        where: { campusId: { in: campusIds }, role: 'VENDOR' as any },
        _count: { id: true },
      }),
      this.prisma.user.groupBy({
        by: ['campusId'],
        where: { campusId: { in: campusIds }, role: 'STUDENT' as any },
        _count: { id: true },
      }),
    ]);

    const vendorMap = Object.fromEntries(vendorCounts.map((r) => [r.campusId, r._count.id]));
    const studentMap = Object.fromEntries(studentCounts.map((r) => [r.campusId, r._count.id]));

    return campuses.map(({ _count, ...campus }) => ({
      ...campus,
      _count: {
        vendors: vendorMap[campus.id] ?? 0,
        students: studentMap[campus.id] ?? 0,
      },
    }));
  }

  async findById(id: string) {
    const campus = await this.prisma.campus.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            products: true,
          },
        },
      },
    });

    if (!campus) {
      throw new NotFoundException('Campus not found');
    }

    return campus;
  }

  async update(id: string, updateDto: UpdateCampusDto) {
    const campus = await this.prisma.campus.findUnique({ where: { id } });
    if (!campus) {
      throw new NotFoundException('Campus not found');
    }

    return this.prisma.campus.update({
      where: { id },
      data: updateDto,
    });
  }

  async delete(id: string) {
    const campus = await this.prisma.campus.findUnique({ where: { id } });
    if (!campus) {
      throw new NotFoundException('Campus not found');
    }

    // Soft delete by deactivating
    return this.prisma.campus.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
