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
import { NotificationsService } from '../notifications/notifications.service.js';
import { AuditService } from '../audit/audit.service.js';
import { UpdatePropertyDTO } from '../properties/dto/update-property.dto.js';
import { AdminUsersQueryDTO, BulkStatusDTO } from './dto/admin-extra.dto.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

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

  async updateStatus(id: number, body: UpdateStatusDTO, adminId?: number) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException("E'lon topilmadi");
    }

    const updated = await this.prisma.property.update({
      where: { id },
      data: {
        status: body.status,
        rejectReason: body.status === 'REJECTED' ? body.reason : null,
      },
    });

    if (property.status !== body.status) {
      if (body.status === 'APPROVED') {
        await this.notifications.notify(
          property.ownerId,
          'PROPERTY_APPROVED',
          `E'loningiz tasdiqlandi: ${property.title}`,
          `/properties/${id}`,
        );
      } else {
        await this.notifications.notify(
          property.ownerId,
          'PROPERTY_REJECTED',
          `E'loningiz rad etildi: ${property.title}. Sabab: ${body.reason}`,
          `/dashboard/${id}/edit`,
        );
      }
    }
    if (adminId) {
      await this.audit.log(
        adminId,
        body.status === 'APPROVED' ? 'PROPERTY_APPROVE' : 'PROPERTY_REJECT',
        'Property',
        id,
        body.status === 'REJECTED' ? body.reason : undefined,
      );
    }
    return updated;
  }

  async bulkUpdateStatus(body: BulkStatusDTO, adminId: number) {
    const results: { id: number; ok: boolean }[] = [];
    for (const id of [...new Set(body.ids)]) {
      try {
        await this.updateStatus(id, { status: body.status, reason: body.reason }, adminId);
        results.push({ id, ok: true });
      } catch {
        results.push({ id, ok: false });
      }
    }
    return { results, done: results.filter((r) => r.ok).length };
  }

  async updatePropertyByAdmin(id: number, body: UpdatePropertyDTO, adminId: number) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) {
      throw new NotFoundException("E'lon topilmadi");
    }
    // Holat o'zgarmaydi: admin tuzatishi qayta moderatsiyaga tushirmaydi
    const updated = await this.prisma.property.update({ where: { id }, data: { ...body } });
    await this.audit.log(adminId, 'PROPERTY_EDIT', 'Property', id, Object.keys(body).join(','));
    return updated;
  }

  async setExpiry(id: number, days: number, adminId: number) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) {
      throw new NotFoundException("E'lon topilmadi");
    }
    const updated = await this.prisma.property.update({
      where: { id },
      data: {
        expiresAt: new Date(Date.now() + days * 86_400_000),
        expiryReminderSentAt: null,
      },
    });
    await this.audit.log(adminId, 'PROPERTY_EXPIRY', 'Property', id, `${days} kun`);
    return updated;
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

    await this.audit.log(currentUserId, 'USER_ROLE', 'User', id, `${user.role} -> ${body.role}`);
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

  async getUsers(query: AdminUsersQueryDTO = {}) {
    const where: Prisma.UserWhereInput = {};
    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }
    if (query.verified === 'yes') where.emailVerifiedAt = { not: null };
    if (query.verified === 'no') where.emailVerifiedAt = null;
    if (query.blocked === 'yes') where.blockedAt = { not: null };
    if (query.blocked === 'no') where.blockedAt = null;

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        emailVerifiedAt: true,
        blockedAt: true,
        lastLoginAt: true,
        _count: { select: { properties: true } },
      },
    });
  }

  async setBlocked(id: number, blocked: boolean, adminId: number) {
    if (id === adminId) {
      throw new BadRequestException("O'zingizni bloklay olmaysiz");
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }
    if (user.role === 'ADMIN') {
      throw new ForbiddenException("Adminni bloklab bo'lmaydi: avval rolini oling");
    }
    await this.audit.log(adminId, blocked ? 'USER_BLOCK' : 'USER_UNBLOCK', 'User', id);
    return this.prisma.user.update({
      where: { id },
      data: { blockedAt: blocked ? new Date() : null },
      select: { id: true, blockedAt: true },
    });
  }

  async getReports() {
    return this.prisma.report.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { id: true, title: true, status: true } },
        reporter: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async resolveReport(id: number, adminId?: number) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException('Shikoyat topilmadi');
    }
    if (adminId) await this.audit.log(adminId, 'REPORT_RESOLVE', 'Report', id);
    return this.prisma.report.update({
      where: { id },
      data: { resolved: true },
    });
  }

  async hideReportedProperty(reportId: number, adminId: number) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { property: true },
    });
    if (!report) {
      throw new NotFoundException('Shikoyat topilmadi');
    }
    const reason = "Shikoyat asosida yashirildi. Ma'lumotlarni tuzatib qayta yuboring.";
    await this.updateStatus(report.propertyId, { status: 'REJECTED', reason }, adminId);
    await this.prisma.report.updateMany({
      where: { propertyId: report.propertyId },
      data: { resolved: true },
    });
    await this.audit.log(adminId, 'REPORT_HIDE', 'Property', report.propertyId);
    return { message: "E'lon yashirildi" };
  }

  async warnReportedOwner(reportId: number, adminId: number) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { property: true },
    });
    if (!report) {
      throw new NotFoundException('Shikoyat topilmadi');
    }
    await this.notifications.notify(
      report.property.ownerId,
      'REPORT_WARNING',
      `E'loningiz haqida shikoyat keldi: ${report.property.title}. Ma'lumotlarni tekshirib, kerak bo'lsa tuzating.`,
      `/dashboard/${report.propertyId}/edit`,
    );
    await this.prisma.report.update({ where: { id: reportId }, data: { resolved: true } });
    await this.audit.log(adminId, 'REPORT_WARN', 'Property', report.propertyId);
    return { message: 'Sotuvchi ogohlantirildi' };
  }

  async getStats() {
    const [props, users, inquiries, top, totals] = await Promise.all([
      this.prisma.$queryRaw<{ d: Date; n: bigint }[]>`SELECT date_trunc('day', "createdAt")::date AS d, COUNT(*) AS n FROM "Property" WHERE "createdAt" > NOW() - INTERVAL '30 days' GROUP BY 1`,
      this.prisma.$queryRaw<{ d: Date; n: bigint }[]>`SELECT date_trunc('day', "createdAt")::date AS d, COUNT(*) AS n FROM "User" WHERE "createdAt" > NOW() - INTERVAL '30 days' GROUP BY 1`,
      this.prisma.$queryRaw<{ d: Date; n: bigint }[]>`SELECT date_trunc('day', "createdAt")::date AS d, COUNT(*) AS n FROM "Inquiry" WHERE "createdAt" > NOW() - INTERVAL '30 days' GROUP BY 1`,
      this.prisma.property.findMany({
        where: { status: 'APPROVED' },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: { id: true, title: true, viewCount: true, city: true },
      }),
      Promise.all([
        this.prisma.property.count(),
        this.prisma.user.count(),
        this.prisma.inquiry.count(),
        this.prisma.report.count({ where: { resolved: false } }),
      ]),
    ]);

    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      days.push(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
    }
    const series = (rows: { d: Date; n: bigint }[]) => {
      const map = new Map(rows.map((r) => [new Date(r.d).toISOString().slice(0, 10), Number(r.n)]));
      return days.map((d) => ({ day: d, count: map.get(d) ?? 0 }));
    };
    return {
      properties: series(props),
      users: series(users),
      inquiries: series(inquiries),
      topViewed: top,
      totals: {
        properties: totals[0],
        users: totals[1],
        inquiries: totals[2],
        openReports: totals[3],
      },
    };
  }

  getAudit(page?: number) {
    return this.audit.list(page ?? 1);
  }
}
