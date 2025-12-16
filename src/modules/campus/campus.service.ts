import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';
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
    return this.prisma.campus.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
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
