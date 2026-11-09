import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { ChangePasswordDTO, DeleteAccountDTO } from './dto/account.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateUserDTO } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateMe(userId: number, dto: UpdateUserDTO) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async changePassword(userId: number, dto: ChangePasswordDTO) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException("Joriy parol noto'g'ri");
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException("Yangi parol eskisidan farq qilsin");
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
    });
    return { message: 'Parol almashtirildi' };
  }

  async deleteAccount(userId: number, dto: DeleteAccountDTO) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Parol noto'g'ri");
    }
    const superAdmin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (user.role === 'ADMIN' || (superAdmin && user.email.toLowerCase() === superAdmin)) {
      throw new ForbiddenException("Admin hisobini o'chirib bo'lmaydi: avval rolini oling");
    }

    const images = await this.prisma.propertyImage.findMany({
      where: { property: { ownerId: userId } },
      select: { url: true },
    });

    // Bog'liq yozuvlar bitta tranzaksiyada o'chadi (Property -> images, favorites, inquiries cascade)
    await this.prisma.$transaction([
      this.prisma.report.deleteMany({
        where: { OR: [{ reporterId: userId }, { property: { ownerId: userId } }] },
      }),
      this.prisma.favorite.deleteMany({ where: { userId } }),
      this.prisma.inquiry.deleteMany({ where: { senderId: userId } }),
      this.prisma.property.deleteMany({ where: { ownerId: userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    for (const img of images) {
      try {
        await unlink(join(process.cwd(), img.url));
      } catch {
        /* fayl allaqachon yo'q */
      }
    }
    return { message: "Hisob o'chirildi" };
  }
}
