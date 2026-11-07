import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async getFavorites(userId: number) {
    return this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          include: {
            images: { take: 1, orderBy: { sortOrder: 'asc' } },
            category: true,
          },
        },
      },
    });
  }

  async addFavorite(userId: number, propertyId: number) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.status !== 'APPROVED') {
      throw new NotFoundException("E'lon topilmadi");
    }

    const existing = await this.prisma.favorite.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });

    if (existing) {
      throw new ConflictException("Bu e'lon allaqachon saqlangan");
    }

    return this.prisma.favorite.create({
      data: { userId, propertyId },
    });
  }
  async removeFavorite(userId: number, propertyId: number) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });

    if (!existing) {
      throw new NotFoundException("Bu e'lon saqlanganlar ro'yxatida yo'q");
    }

    await this.prisma.favorite.delete({
      where: { userId_propertyId: { userId, propertyId } },
    });

    return { message: "Saqlanganlardan olib tashlandi" };
  }
}