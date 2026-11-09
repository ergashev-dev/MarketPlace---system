import { NotificationsService } from '../notifications/notifications.service.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { InquiriesService } from './inquiries.service.js';

describe('InquiriesService (B3)', () => {
  const prisma = {
    property: { findUnique: vi.fn() },
    inquiry: { create: vi.fn(), findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  };
  const service = new InquiriesService(prisma as any, { notify: vi.fn() } as any);

  beforeEach(() => vi.resetAllMocks());

  describe('getReceivedInquiries', () => {
    it("faqat joriy user e'lonlariga kelganlarni, sahifalab va sender/property bilan qaytaradi", async () => {
      prisma.inquiry.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.inquiry.count.mockResolvedValue(25);

      const res = await service.getReceivedInquiries(7, { page: 2, limit: 10 });

      expect(prisma.inquiry.findMany).toHaveBeenCalledWith({
        where: { property: { ownerId: 7 } },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
        include: {
          sender: { select: { id: true, fullName: true, phone: true, email: true } },
          property: { select: { id: true, title: true } },
        },
      });
      expect(prisma.inquiry.count).toHaveBeenCalledWith({ where: { property: { ownerId: 7 } } });
      expect(res.meta).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
    });

    it('default page=1, limit=12', async () => {
      prisma.inquiry.findMany.mockResolvedValue([]);
      prisma.inquiry.count.mockResolvedValue(0);
      const res = await service.getReceivedInquiries(7, {});
      expect(res.meta).toEqual({ page: 1, limit: 12, total: 0, totalPages: 0 });
    });
  });

  describe('markAsRead', () => {
    it('murojaat yo`q -> 404', async () => {
      prisma.inquiry.findUnique.mockResolvedValue(null);
      await expect(service.markAsRead(1, 7)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("egasi bo'lmasa -> 403 va yangilanmaydi", async () => {
      prisma.inquiry.findUnique.mockResolvedValue({ id: 1, readAt: null, property: { ownerId: 8 } });
      await expect(service.markAsRead(1, 7)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.inquiry.update).not.toHaveBeenCalled();
    });

    it('egasi -> readAt qo`yiladi', async () => {
      prisma.inquiry.findUnique.mockResolvedValue({ id: 1, readAt: null, property: { ownerId: 7 } });
      prisma.inquiry.update.mockResolvedValue({ id: 1, readAt: new Date() });
      await service.markAsRead(1, 7);
      expect(prisma.inquiry.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { readAt: expect.any(Date) },
      });
    });

    it("allaqachon o'qilgan bo'lsa readAt o'zgarmaydi", async () => {
      const readAt = new Date('2026-01-01');
      prisma.inquiry.findUnique.mockResolvedValue({ id: 1, readAt, property: { ownerId: 7 } });
      const res = await service.markAsRead(1, 7);
      expect(prisma.inquiry.update).not.toHaveBeenCalled();
      expect(res.readAt).toBe(readAt);
    });
  });
});
