import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(vendorUserId: string, createDto: CreateProductDto) {
    // Get vendor by user ID
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: vendorUserId },
      include: { user: { select: { campusId: true } } },
    });

    if (!vendor) {
      throw new ForbiddenException('You must be a vendor to create products');
    }

    if (!vendor.user.campusId) {
      throw new ForbiddenException('You must be assigned to a campus');
    }

    return this.prisma.product.create({
      data: {
        ...createDto,
        price: new Prisma.Decimal(createDto.price),
        vendorId: vendor.id,
        campusId: vendor.user.campusId,
      },
      include: {
        vendor: { select: { storeName: true } },
        category: { select: { name: true } },
      },
    });
  }

  async findAll(query: ProductQueryDto) {
    const {
      search,
      campusId,
      vendorId,
      categoryId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(campusId && { campusId }),
      ...(vendorId && { vendorId }),
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          vendor: { select: { storeName: true, rating: true } },
          category: { select: { name: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            storeName: true,
            rating: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        category: { select: { name: true } },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, vendorUserId: string, updateDto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { vendor: { select: { userId: true } } },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendor.userId !== vendorUserId) {
      throw new ForbiddenException('You can only update your own products');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...updateDto,
        ...(updateDto.price && { price: new Prisma.Decimal(updateDto.price) }),
      },
    });
  }

  async delete(id: string, vendorUserId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { vendor: { select: { userId: true } } },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendor.userId !== vendorUserId) {
      throw new ForbiddenException('You can only delete your own products');
    }

    // Soft delete
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getMyProducts(vendorUserId: string, query: ProductQueryDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: vendorUserId },
    });

    if (!vendor) {
      throw new ForbiddenException('Vendor profile not found');
    }

    return this.findAll({ ...query, vendorId: vendor.id });
  }
}
