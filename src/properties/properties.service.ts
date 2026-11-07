import {
    BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePropertyDTO } from './dto/create-property.dto.js';
import { UpdatePropertyDTO } from './dto/update-property.dto.js';
import { Prisma } from '@prisma/client';
import { QueryPropertyDTO } from './dto/query-property.dto.js';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkCategory(categoryId: number) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Kategoriya topilmadi');
    }
  }

  private async findOwnProperty(id: number, userId: number) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });
    if (!property) {
      throw new NotFoundException("E'lon topilmadi");
    }
    if (property.ownerId !== userId) {
      throw new ForbiddenException("Bu e'lon sizga tegishli emas");
    }
    return property;
  }

  async createProperty(body: CreatePropertyDTO, userId: number) {
    await this.checkCategory(body.categoryId);

    return this.prisma.property.create({
      data: {
        ...body,
        ownerId: userId,
      },
    });
  }

  async getPropertyById(id: number) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
        owner: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
      },
    });
    

    if (!property || property.status !== 'APPROVED') {
      throw new NotFoundException("E'lon topilmadi");
    }

    return property;
  }

  async getMyProperties(userId: number) {
    return this.prisma.property.findMany({
      where: {
        ownerId: userId,
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
      },
      orderBy: {createdAt: 'desc'}
    });
  }

  async getProperties(query: QueryPropertyDTO) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException(
        "minPrice maxPrice'dan katta bo'lmasligi kerak",
      );
    }

    const where: Prisma.PropertyWhereInput = {
      status: 'APPROVED',
    };

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.category) {
      where.category = { slug: query.category };
    }

    if (query.type) {
      where.listingType = query.type;
    }

    if (query.rooms !== undefined) {
      where.rooms = query.rooms;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const priceFilter: Prisma.FloatFilter = {};
      if (query.minPrice !== undefined) priceFilter.gte = query.minPrice;
      if (query.maxPrice !== undefined) priceFilter.lte = query.maxPrice;
      where.price = priceFilter;
    }

    let orderBy: Prisma.PropertyOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sort === 'price_asc') orderBy = { price: 'asc' };
    if (query.sort === 'price_desc') orderBy = { price: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
          category: true,
        },
      }),
      this.prisma.property.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateProperty(id: number, userId: number, body: UpdatePropertyDTO) {
    await this.findOwnProperty(id, userId);

    if (body.categoryId) {
      await this.checkCategory(body.categoryId);
    }

    return this.prisma.property.update({
      where: { id },
      data: {
        ...body,
        status: 'PENDING',
      },
    });
  }

  async deleteProperty(id: number, userId: number) {
    await this.findOwnProperty(id, userId);

    return this.prisma.property.delete({
      where: { id },
    });
  }
}