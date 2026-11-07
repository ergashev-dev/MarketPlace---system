import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDTO } from './dto/create-category.dto.js';
import { UpdateCategoryDTO } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  getCategories() {
    return this.prisma.category.findMany();
  }

  async createCategory(body: CreateCategoryDTO) {
    const sameName = await this.prisma.category.findUnique({
      where: { name: body.name },
    });
    if (sameName) {
      throw new ConflictException('Bunday nomli kategoriya mavjud');
    }

    const sameSlug = await this.prisma.category.findUnique({
      where: { slug: body.slug },
    });
    if (sameSlug) {
      throw new ConflictException('Bunday slug mavjud');
    }

    return this.prisma.category.create({
      data: body,
    });
  }

  async updateCategory(id: number, body: UpdateCategoryDTO) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Kategoriya topilmadi');
    }

    if (body.name) {
      const sameName = await this.prisma.category.findUnique({
        where: { name: body.name },
      });
      if (sameName && sameName.id !== id) {
        throw new ConflictException('Bunday nomli kategoriya mavjud');
      }
    }

    if (body.slug) {
      const sameSlug = await this.prisma.category.findUnique({
        where: { slug: body.slug },
      });
      if (sameSlug && sameSlug.id !== id) {
        throw new ConflictException('Bunday slug mavjud');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: body,
    });
  }

  async deleteCategory(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Kategoriya topilmadi');
    }

    const propertiesCount = await this.prisma.property.count({
      where: { categoryId: id },
    });
    if (propertiesCount > 0) {
      throw new BadRequestException(
        "Bu kategoriyada e'lonlar bor, avval ularni o'chiring",
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}