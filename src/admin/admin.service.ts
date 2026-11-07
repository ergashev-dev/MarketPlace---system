import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminQueryDTO } from './dto/admin-query.dto.js';
import { UpdateStatusDTO } from './dto/update-status.dto.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getProperties(query: AdminQueryDTO) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const where: Prisma.PropertyWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
          category: true,
          owner: { select: { id: true, fullName: true, email: true } },
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

  async updateStatus(id: number, body: UpdateStatusDTO) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException("E'lon topilmadi");
    }

    return this.prisma.property.update({
      where: { id },
      data: { status: body.status },
    });
  }

  async getUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: { select: { properties: true } },
      },
    });
  }
}