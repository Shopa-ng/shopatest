import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { IsString } from 'class-validator';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException('Category with this name already exists');
    }

    return this.prisma.category.create({
      data: createDto,
    });
  }

  async findAll(activeOnly = true) {
    return this.prisma.category.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        _count: {
          select: { products: true },
        },
        // @ts-ignore
        subCategories: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
        // @ts-ignore
        subCategories: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, updateDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (updateDto.name && updateDto.name !== category.name) {
      const existing = await this.prisma.category.findUnique({
        where: { name: updateDto.name },
      });
      if (existing) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateDto,
    });
  }

  async delete(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── SubCategories ────────────────────────────────────────────────────────────

  async getSubCategories(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    // @ts-ignore
    return this.prisma.subCategory.findMany({
      where: { categoryId },
      orderBy: { name: 'asc' },
    });
  }

  async createSubCategory(categoryId: string, name: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    // @ts-ignore
    const existing = await this.prisma.subCategory.findFirst({
      where: { categoryId, name },
    });
    if (existing) {
      throw new ConflictException(
        'Subcategory with this name already exists in this category',
      );
    }

    // @ts-ignore
    return this.prisma.subCategory.create({
      data: { name, categoryId },
    });
  }

  async deleteSubCategory(id: string) {
    // @ts-ignore
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { id },
    });
    if (!subCategory) throw new NotFoundException('Subcategory not found');

    // @ts-ignore
    return this.prisma.subCategory.delete({ where: { id } });
  }
}