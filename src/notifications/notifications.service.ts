import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Bildirishnoma yozish asosiy amalni hech qachon buzmasin. */
  async notify(userId: number, type: string, text: string, link?: string) {
    try {
      await this.prisma.notification.create({
        data: { userId, type, text, link },
      });
    } catch (err) {
      this.logger.warn(`Bildirishnoma yozilmadi: ${(err as Error).message}`);
    }
  }

  async list(userId: number) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, unread };
  }

  async unreadCount(userId: number) {
    return {
      unread: await this.prisma.notification.count({
        where: { userId, readAt: null },
      }),
    };
  }

  async markRead(userId: number, id: number) {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
