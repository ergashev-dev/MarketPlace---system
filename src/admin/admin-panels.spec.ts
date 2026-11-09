import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { UsersService } from '../users/users.service.js';
import bcrypt from 'bcrypt';

function admin() {
  const prisma: any = {
    property: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: 1 }),
    },
    user: { findUnique: vi.fn(), update: vi.fn().mockResolvedValue({ id: 2 }) },
    report: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  };
  const notifications: any = { notify: vi.fn() };
  const audit: any = { log: vi.fn() };
  return { prisma, notifications, audit, service: new AdminService(prisma, notifications, audit) };
}

describe('AdminService (panels)', () => {
  it('status change notifies owner and writes audit log', async () => {
    const { prisma, notifications, audit, service } = admin();
    prisma.property.findUnique.mockResolvedValue({ id: 1, ownerId: 7, title: 'Uy', status: 'PENDING' });
    await service.updateStatus(1, { status: 'REJECTED', reason: 'Rasm yomon' }, 99);
    expect(notifications.notify).toHaveBeenCalledWith(7, 'PROPERTY_REJECTED', expect.stringContaining('Rasm yomon'), '/dashboard/1/edit');
    expect(audit.log).toHaveBeenCalledWith(99, 'PROPERTY_REJECT', 'Property', 1, 'Rasm yomon');
  });

  it('no notification when status is unchanged', async () => {
    const { prisma, notifications, service } = admin();
    prisma.property.findUnique.mockResolvedValue({ id: 1, ownerId: 7, title: 'Uy', status: 'APPROVED' });
    await service.updateStatus(1, { status: 'APPROVED' }, 99);
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('bulk update reports per-item success', async () => {
    const { prisma, service } = admin();
    prisma.property.findUnique.mockImplementation(({ where }: any) =>
      where.id === 2 ? null : { id: where.id, ownerId: 1, title: 'x', status: 'PENDING' },
    );
    const res = await service.bulkUpdateStatus({ ids: [1, 2, 1], status: 'APPROVED' }, 5);
    expect(res.results).toEqual([{ id: 1, ok: true }, { id: 2, ok: false }]);
    expect(res.done).toBe(1);
  });

  it('cannot block yourself or an admin', async () => {
    const { prisma, service } = admin();
    await expect(service.setBlocked(5, true, 5)).rejects.toBeInstanceOf(BadRequestException);
    prisma.user.findUnique.mockResolvedValue({ id: 6, role: 'ADMIN' });
    await expect(service.setBlocked(6, true, 5)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks a regular user', async () => {
    const { prisma, audit, service } = admin();
    prisma.user.findUnique.mockResolvedValue({ id: 6, role: 'USER' });
    await service.setBlocked(6, true, 5);
    expect(prisma.user.update.mock.calls[0][0].data.blockedAt).toBeInstanceOf(Date);
    expect(audit.log).toHaveBeenCalledWith(5, 'USER_BLOCK', 'User', 6);
  });
});

describe('UsersService (account)', () => {
  const hash = bcrypt.hashSync('oldpassword1', 4);
  function users(role = 'USER') {
    const prisma: any = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 1, email: 'a@b.uz', role, passwordHash: hash }),
        update: vi.fn(),
        delete: vi.fn(),
      },
      propertyImage: { findMany: vi.fn().mockResolvedValue([]) },
      report: { deleteMany: vi.fn() },
      favorite: { deleteMany: vi.fn() },
      inquiry: { deleteMany: vi.fn() },
      property: { deleteMany: vi.fn() },
      $transaction: vi.fn().mockResolvedValue([]),
    };
    return { prisma, service: new UsersService(prisma) };
  }

  it('rejects a wrong current password', async () => {
    const { prisma, service } = users();
    await expect(service.changePassword(1, { currentPassword: 'nope', newPassword: 'newpassword1' })).rejects.toThrow();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('changes password and stores only a hash', async () => {
    const { prisma, service } = users();
    await service.changePassword(1, { currentPassword: 'oldpassword1', newPassword: 'newpassword1' });
    const saved = prisma.user.update.mock.calls[0][0].data.passwordHash;
    expect(saved).not.toBe('newpassword1');
    expect(bcrypt.compareSync('newpassword1', saved)).toBe(true);
  });

  it('deletes account only with the right password and never an admin', async () => {
    const { prisma, service } = users();
    await expect(service.deleteAccount(1, { password: 'bad' })).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    await service.deleteAccount(1, { password: 'oldpassword1' });
    expect(prisma.$transaction).toHaveBeenCalled();

    const adm = users('ADMIN');
    await expect(adm.service.deleteAccount(1, { password: 'oldpassword1' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(adm.prisma.$transaction).not.toHaveBeenCalled();
  });
});
