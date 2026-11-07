import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateInquiryDTO } from './dto/create-inquiry.dto.js';

@Injectable()
export class InquiriesService {
  constructor(private readonly prisma: PrismaService) {}
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

    return this.prisma.inquiry.create({
      data: {
        message: body.message,
        phone: body.phone,
        senderId: userId,
        propertyId,
      },
    });
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
}