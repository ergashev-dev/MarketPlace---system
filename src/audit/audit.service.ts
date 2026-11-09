import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    adminId: number,
    action: string,
    targetType: string,
    targetId?: number,
    details?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: { adminId, action, targetType, targetId, details },
      });
    } catch (err) {
      this.logger.warn(`Audit yozilmadi: ${(err as Error).message}`);
    }
  }

  list(page = 1, limit = 30) {
    return this.prisma.auditLog
      .findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { admin: { select: { id: true, fullName: true, email: true } } },
      })
      .then(async (data) => ({
        data,
        meta: {
          page,
          limit,
          total: await this.prisma.auditLog.count(),
        },
      }));
  }
}
