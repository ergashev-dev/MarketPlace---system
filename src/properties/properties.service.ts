import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, PropertyStatus } from '@prisma/client';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePropertyDTO } from './dto/create-property.dto.js';
import { UpdatePropertyDTO } from './dto/update-property.dto.js';
import { QueryPropertyDTO } from './dto/query-property.dto.js';
import { ClosePropertyDTO } from './dto/close-property.dto.js';
import { ReportPropertyDTO } from './dto/report-property.dto.js';
import { Express } from 'express';
import { isEmailVerificationEnabled } from '../common/app-config.js';

const LISTING_TTL_DAYS = 60;
const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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

  // Rasm o'zgarsa, APPROVED/REJECTED e'lon qayta moderatsiyaga (PENDING) qaytadi
  private moderationReset(propertyId: number, status: PropertyStatus) {
    if (status === 'PENDING') {
      return [];
    }
    return [
      this.prisma.property.update({
        where: { id: propertyId },
        data: { status: 'PENDING', rejectReason: null },
      }),
    ];
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
      // Muddati o'tgan e'lonlar ko'rinmaydi (expiresAt yo'q bo'lsa cheksiz)
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
    };

    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (
      query.minLat !== undefined ||
      query.maxLat !== undefined ||
      query.minLng !== undefined ||
      query.maxLng !== undefined
    ) {
      const lat: Prisma.FloatNullableFilter = {};
      const lng: Prisma.FloatNullableFilter = {};
      if (query.minLat !== undefined) lat.gte = query.minLat;
      if (query.maxLat !== undefined) lat.lte = query.maxLat;
      if (query.minLng !== undefined) lng.gte = query.minLng;
      if (query.maxLng !== undefined) lng.lte = query.maxLng;
      where.lat = lat;
      where.lng = lng;
    }

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

    // currency berilmasa narx filtri valyutadan qat'i nazar ishlaydi (orqaga moslik)
    if (query.currency) {
      where.currency = query.currency;
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
    if (query.sort === 'area_asc') orderBy = { area: 'asc' };
    if (query.sort === 'area_desc') orderBy = { area: 'desc' };
    if (query.sort === 'popular') orderBy = { viewCount: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: { take: 3, orderBy: { sortOrder: 'asc' } },
          category: true,
          _count: { select: { favorites: true } },
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
        _count: { select: { favorites: true } },
      },
    });

    if (
      !property ||
      property.status !== 'APPROVED' ||
      (property.expiresAt && property.expiresAt < new Date())
    ) {
      throw new NotFoundException("E'lon topilmadi");
    }

    const day = new Date(new Date().toISOString().slice(0, 10));
    await this.prisma.$transaction([
      this.prisma.property.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      }),
      this.prisma.propertyViewDaily.upsert({
        where: { propertyId_day: { propertyId: id, day } },
        create: { propertyId: id, day, count: 1 },
        update: { count: { increment: 1 } },
      }),
    ]);

    return { ...property, viewCount: property.viewCount + 1 };
  }

  async getSimilar(id: number) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property || property.status !== 'APPROVED') {
      throw new NotFoundException("E'lon topilmadi");
    }

    return this.prisma.property.findMany({
      where: {
        id: { not: id },
        status: 'APPROVED',
        closedAt: null,
        city: property.city,
        categoryId: property.categoryId,
        listingType: property.listingType,
        currency: property.currency,
        price: { gte: property.price * 0.7, lte: property.price * 1.3 },
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
      include: {
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
        category: true,
      },
    });
  }

  async getMyProperties(userId: number) {
    return this.prisma.property.findMany({
      where: { ownerId: userId },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
        _count: { select: { favorites: true, inquiries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProperty(body: CreatePropertyDTO, userId: number) {
    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, emailVerifiedAt: true, blockedAt: true },
    });
    if (!owner) {
      throw new NotFoundException('User mavjud emas');
    }
    if (owner.blockedAt) {
      throw new ForbiddenException('Hisobingiz bloklangan');
    }
    if (
      isEmailVerificationEnabled() &&
      owner.role !== 'ADMIN' &&
      !owner.emailVerifiedAt
    ) {
      throw new ForbiddenException(
        "E'lon joylash uchun avval emailingizni tasdiqlang",
      );
    }

    await this.checkCategory(body.categoryId);


    return this.prisma.property.create({
      data: {
        ...body,
        ownerId: userId,
        expiresAt: daysFromNow(LISTING_TTL_DAYS),
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
        rejectReason: null,
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
    const property = await this.findOwnProperty(propertyId, userId);

    const imagesCount = await this.prisma.propertyImage.count({
      where: { propertyId },
    });

    const [image] = await this.prisma.$transaction([
      this.prisma.propertyImage.create({
        data: {
          url: `/uploads/properties/${file.filename}`,
          propertyId,
          sortOrder: imagesCount,
        },
      }),
      ...this.moderationReset(propertyId, property.status),
    ]);

    return image;
  }

  async deleteImage(propertyId: number, imageId: number, userId: number) {
    const property = await this.findOwnProperty(propertyId, userId);

    const image = await this.prisma.propertyImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.propertyId !== propertyId) {
      throw new NotFoundException('Rasm topilmadi');
    }

    await this.prisma.$transaction([
      this.prisma.propertyImage.delete({
        where: { id: imageId },
      }),
      ...this.moderationReset(propertyId, property.status),
    ]);

    await this.removeFile(image.url);

    return { message: "Rasm o'chirildi" };
  }

  async setClosed(id: number, userId: number, body: ClosePropertyDTO) {
    await this.findOwnProperty(id, userId);
    return this.prisma.property.update({
      where: { id },
      data: { closedAt: body.closed ? new Date() : null },
    });
  }

  async renew(id: number, userId: number) {
    await this.findOwnProperty(id, userId);
    return this.prisma.property.update({
      where: { id },
      data: { expiresAt: daysFromNow(LISTING_TTL_DAYS), expiryReminderSentAt: null },
    });
  }

  async report(propertyId: number, userId: number, body: ReportPropertyDTO) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property || property.status !== 'APPROVED') {
      throw new NotFoundException("E'lon topilmadi");
    }
    if (property.ownerId === userId) {
      throw new BadRequestException("O'z e'loningizga shikoyat qila olmaysiz");
    }

    const existing = await this.prisma.report.findUnique({
      where: { reporterId_propertyId: { reporterId: userId, propertyId } },
    });
    if (existing) {
      throw new ConflictException("Siz bu e'londan allaqachon shikoyat qilgansiz");
    }

    await this.prisma.report.create({
      data: {
        propertyId,
        reporterId: userId,
        reason: body.reason,
        message: body.message,
      },
    });

    const open = await this.prisma.report.count({
      where: { propertyId, resolved: false },
    });
    if (open >= 3 && property.status === 'APPROVED') {
      await this.prisma.property.update({
        where: { id: propertyId },
        data: { status: 'PENDING', rejectReason: null },
      });
      await this.notifications.notify(
        property.ownerId,
        'REPORT_REVIEW',
        `E'loningiz bir nechta shikoyat tufayli qayta tekshiruvga olindi: ${property.title}`,
        `/dashboard/${propertyId}/edit`,
      );
    }
    return { message: 'Shikoyat qabul qilindi' };
  }

  async getSitemapEntries() {
    return this.prisma.property.findMany({
      where: {
        status: 'APPROVED',
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ],
      },
      select: { id: true, createdAt: true },
      orderBy: { id: 'asc' },
      take: 5000,
    });
  }

  async getOwnerStats(id: number, userId: number) {
    const property = await this.findOwnProperty(id, userId);
    const from = new Date(Date.now() - 29 * 86_400_000);
    const rows = await this.prisma.propertyViewDaily.findMany({
      where: { propertyId: id, day: { gte: new Date(from.toISOString().slice(0, 10)) } },
    });
    const map = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), r.count]));
    const views: { day: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      views.push({ day: d, count: map.get(d) ?? 0 });
    }
    const [favorites, inquiries] = await Promise.all([
      this.prisma.favorite.count({ where: { propertyId: id } }),
      this.prisma.inquiry.count({ where: { propertyId: id } }),
    ]);
    return { views, totals: { views: property.viewCount, favorites, inquiries } };
  }

  /** Muddati yaqinlashgan e'lonlar egasiga eslatma (bildirishnoma). Email — ExpiryJob'da. */
  async findExpiringSoon(days = 5) {
    return this.prisma.property.findMany({
      where: {
        status: 'APPROVED',
        closedAt: null,
        expiryReminderSentAt: null,
        expiresAt: { gt: new Date(), lt: new Date(Date.now() + days * 86_400_000) },
      },
      include: { owner: { select: { id: true, email: true, fullName: true } } },
      take: 200,
    });
  }

  async markReminded(id: number) {
    await this.prisma.property.update({ where: { id }, data: { expiryReminderSentAt: new Date() } });
  }
}
