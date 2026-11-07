import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePropertyDTO } from './dto/create-property.dto.js';
import { UpdatePropertyDTO } from './dto/update-property.dto.js';
import { QueryPropertyDTO } from './dto/query-property.dto.js';
import { Express } from 'express';

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

  private async removeFile(url: string) {
    try {
      await unlink(join(process.cwd(), url));
    } catch {}
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

    let orderBy: Prisma.PropertyOrderByWithRelationInput = {
      createdAt: 'desc',
    };
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
      where: { ownerId: userId },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });
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

    const images = await this.prisma.propertyImage.findMany({
      where: { propertyId: id },
    });

    await this.prisma.property.delete({
      where: { id },
    });

    for (const image of images) {
      await this.removeFile(image.url);
    }

    return { message: "E'lon o'chirildi" };
  }

  async addImage(
    propertyId: number,
    userId: number,
    file: Express.Multer.File,
  ) {
    await this.findOwnProperty(propertyId, userId);

    const imagesCount = await this.prisma.propertyImage.count({
      where: { propertyId },
    });

    return this.prisma.propertyImage.create({
      data: {
        url: `/uploads/properties/${file.filename}`,
        propertyId,
        sortOrder: imagesCount,
      },
    });
  }

  async deleteImage(propertyId: number, imageId: number, userId: number) {
    await this.findOwnProperty(propertyId, userId);

    const image = await this.prisma.propertyImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.propertyId !== propertyId) {
      throw new NotFoundException('Rasm topilmadi');
    }

    await this.prisma.propertyImage.delete({
      where: { id: imageId },
    });

    await this.removeFile(image.url);

    return { message: "Rasm o'chirildi" };
  }
}
