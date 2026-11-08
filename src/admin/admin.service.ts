import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateRoleDTO } from './dto/update-role.dto.js';
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

  async updateRole(id: number, body: UpdateRoleDTO, currentUserId: number) {
    if (id === currentUserId) {
      throw new BadRequestException("O'z rolingizni o'zgartira olmaysiz");
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const superAdmin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (
      superAdmin &&
      user.email.toLowerCase() === superAdmin &&
      body.role !== 'ADMIN'
    ) {
      throw new ForbiddenException("Asosiy adminning rolini o'zgartirib bo'lmaydi");
    }

    return this.prisma.user.update({
      where: { id },
      data: { role: body.role },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
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