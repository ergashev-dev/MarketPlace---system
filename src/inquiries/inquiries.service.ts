import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateInquiryDTO } from './dto/create-inquiry.dto.js';
import { QueryReceivedInquiriesDTO } from './dto/query-received-inquiries.dto.js';

@Injectable()
export class InquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}
  async createInquiry(
    propertyId: number,
    userId: number,
    body: CreateInquiryDTO,
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.status !== 'APPROVED') {
      throw new NotFoundException("E'lon topilmadi");
    }

    if (property.ownerId === userId) {
      throw new BadRequestException(
        "O'z e'loningizga murojaat yubora olmaysiz",
      );
    }

    const inquiry = await this.prisma.inquiry.create({
      data: {
        message: body.message,
        phone: body.phone,
        senderId: userId,
        propertyId,
      },
    });
    await this.notifications.notify(
      property.ownerId,
      'NEW_INQUIRY',
      `Yangi murojaat: ${property.title}`,
      '/inquiries',
    );
    return inquiry;
  }

  async getMyInquiries(userId: number) {
    return this.prisma.inquiry.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            currency: true,
            city: true,
            images: { take: 1, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });
  }

  async getReceivedInquiries(userId: number, query: QueryReceivedInquiriesDTO) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const where = { property: { ownerId: userId } };

    const [data, total] = await Promise.all([
      this.prisma.inquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: { select: { id: true, fullName: true, phone: true, email: true } },
          property: { select: { id: true, title: true } },
        },
      }),
      this.prisma.inquiry.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async markAsRead(id: number, userId: number) {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { id },
      include: { property: { select: { ownerId: true } } },
    });

    if (!inquiry) {
      throw new NotFoundException('Murojaat topilmadi');
    }
    if (inquiry.property.ownerId !== userId) {
      throw new ForbiddenException('Bu murojaat sizning e\'loningizga tegishli emas');
    }

    if (inquiry.readAt) {
      const { property: _property, ...rest } = inquiry;
      return rest;
    }

    return this.prisma.inquiry.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
}
