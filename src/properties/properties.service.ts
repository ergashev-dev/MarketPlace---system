import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePropertyDTO } from './dto/create-property.dto.js';
import { UpdatePropertyDTO } from './dto/update-property.dto.js';

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