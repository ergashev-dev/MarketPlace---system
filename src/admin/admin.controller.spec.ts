import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, tokenFor, bearer } from '../../test/helpers/app.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { RolesGuard } from '../auth/roles/roles.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AdminController PATCH properties/:id/status (A4)', () => {
  let app: INestApplication;
  const service = { updateStatus: vi.fn().mockResolvedValue({ id: 1 }) };
  // RolesGuard rolni bazadan oladi: id=1 ADMIN, qolganlari USER
  const prisma = {
    user: { findUnique: vi.fn(({ where }) => ({ id: where.id, role: where.id === 1 ? 'ADMIN' : 'USER' })) },
  };
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createTestApp({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: service },
        { provide: PrismaService, useValue: prisma },
        RolesGuard,
      ],
    });
    token = tokenFor(app, { id: 1, role: 'ADMIN' });
  });
  afterEach(() => app.close());

  const patch = (body: object) =>
    request(app.getHttpServer())
      .patch('/admin/properties/1/status')
      .set('Authorization', bearer(token))
      .send(body);

  it('REJECTED reason`siz -> 400', async () => {
    await patch({ status: 'REJECTED' }).expect(400);
    expect(service.updateStatus).not.toHaveBeenCalled();
  });

  it.each([['bo`sh', ''], ['faqat probel', '  '], ['2 belgi', 'ab'], ['501 belgi', 'x'.repeat(501)]])('REJECTED noto`g`ri reason (%s) -> 400', async (_name, reason) => {
    await patch({ status: 'REJECTED', reason }).expect(400);
  });

  it.each(['abc', 'x'.repeat(500), '  abc  '])('REJECTED to`g`ri reason -> 200', async (reason) => {
    await patch({ status: 'REJECTED', reason }).expect(200);
    expect(service.updateStatus).toHaveBeenCalledWith(1, {
      status: 'REJECTED',
      reason: reason.trim(),
    }, 1);
  });

  it('APPROVED reason`siz -> 200', async () => {
    await patch({ status: 'APPROVED' }).expect(200);
  });

  it('APPROVED + reason -> 200 (400 emas)', async () => {
    await patch({ status: 'APPROVED', reason: 'ixtiyoriy' }).expect(200);
  });

  it('PENDING -> 400', async () => {
    await patch({ status: 'PENDING' }).expect(400);
  });

  it('admin bo`lmasa -> 403', async () => {
    const userToken = tokenFor(app, { id: 2, role: 'USER' });
    await request(app.getHttpServer())
      .patch('/admin/properties/1/status')
      .set('Authorization', bearer(userToken))
      .send({ status: 'APPROVED' })
      .expect(403);
  });
});
