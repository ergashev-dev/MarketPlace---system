import { NotificationsService } from '../notifications/notifications.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service.js';

describe('AdminService.updateStatus (A4)', () => {
  const prisma = { property: { findUnique: vi.fn(), update: vi.fn() } };
  const service = new AdminService(prisma as any, { notify: vi.fn() } as any, { log: vi.fn() } as any);

  beforeEach(() => {
    vi.resetAllMocks();
    prisma.property.findUnique.mockResolvedValue({ id: 1 });
  });

  it('REJECTED -> rejectReason saqlanadi', async () => {
    await service.updateStatus(1, { status: 'REJECTED', reason: 'Rasmlar sifatsiz' });
    expect(prisma.property.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'REJECTED', rejectReason: 'Rasmlar sifatsiz' },
    });
  });

  it('APPROVED -> rejectReason null (reason yuborilsa ham)', async () => {
    await service.updateStatus(1, { status: 'APPROVED', reason: 'e`tiborga olinmaydi' });
    expect(prisma.property.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'APPROVED', rejectReason: null },
    });
  });

  it("e'lon yo'q -> 404", async () => {
    prisma.property.findUnique.mockResolvedValue(null);
    await expect(service.updateStatus(9, { status: 'APPROVED' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
