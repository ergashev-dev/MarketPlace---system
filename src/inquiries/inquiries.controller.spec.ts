import { NotificationsService } from '../notifications/notifications.service.js';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service.js';
import { createTestApp, tokenFor, bearer } from '../../test/helpers/app.js';
import { InquiriesController } from './inquiries.controller.js';
import { InquiriesService } from './inquiries.service.js';

const body = { message: "Salom, kvartira hali bo'shmi?", phone: '+998901234567' };

describe('InquiriesController (HTTP)', () => {
  let app: INestApplication;
  const prisma = {
    property: { findUnique: vi.fn() },
    inquiry: { create: vi.fn(), findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    app = await createTestApp({
      controllers: [InquiriesController],
      providers: [InquiriesService, { provide: NotificationsService, useValue: { notify: vi.fn() } }, { provide: PrismaService, useValue: prisma }],
    });
  });

  afterEach(() => app.close());

  it('guard yo`q bo`lsa POST -> 401', async () => {
    await request(app.getHttpServer())
      .post('/properties/1/inquiries')
      .send(body)
      .expect(401);
  });

  it('guard yo`q bo`lsa GET /inquiries/my -> 401', async () => {
    await request(app.getHttpServer()).get('/inquiries/my').expect(401);
  });

  it("noto'g'ri propertyId (abc) -> 400, DB'ga murojaat qilinmaydi", async () => {
    const token = tokenFor(app, { id: 2 });
    await request(app.getHttpServer())
      .post('/properties/abc/inquiries')
      .set('Authorization', bearer(token))
      .send(body)
      .expect(400);
    expect(prisma.property.findUnique).not.toHaveBeenCalled();
  });

  it("e'lon topilmasa -> 404", async () => {
    prisma.property.findUnique.mockResolvedValue(null);
    const token = tokenFor(app, { id: 2 });
    await request(app.getHttpServer())
      .post('/properties/999/inquiries')
      .set('Authorization', bearer(token))
      .send(body)
      .expect(404);
  });

  it("APPROVED bo'lmagan e'lon -> 404", async () => {
    for (const status of ['PENDING', 'REJECTED']) {
      prisma.property.findUnique.mockResolvedValue({ id: 1, ownerId: 1, status });
      const token = tokenFor(app, { id: 2 });
      await request(app.getHttpServer())
        .post('/properties/1/inquiries')
        .set('Authorization', bearer(token))
        .send(body)
        .expect(404);
    }
    expect(prisma.inquiry.create).not.toHaveBeenCalled();
  });

  it("egasi o'z e'loniga yubora olmaydi -> 400", async () => {
    prisma.property.findUnique.mockResolvedValue({ id: 1, ownerId: 5, status: 'APPROVED' });
    const token = tokenFor(app, { id: 5 });
    const res = await request(app.getHttpServer())
      .post('/properties/1/inquiries')
      .set('Authorization', bearer(token))
      .send(body)
      .expect(400);
    expect(res.body.message).toContain("O'z e'loningizga");
    expect(prisma.inquiry.create).not.toHaveBeenCalled();
  });

  it('muvaffaqiyatli -> 201', async () => {
    prisma.property.findUnique.mockResolvedValue({ id: 1, ownerId: 1, status: 'APPROVED' });
    prisma.inquiry.create.mockResolvedValue({ id: 10, ...body, senderId: 2, propertyId: 1 });
    const token = tokenFor(app, { id: 2 });
    const res = await request(app.getHttpServer())
      .post('/properties/1/inquiries')
      .set('Authorization', bearer(token))
      .send(body)
      .expect(201);
    expect(res.body.id).toBe(10);
    expect(prisma.inquiry.create).toHaveBeenCalledWith({
      data: { message: body.message, phone: body.phone, senderId: 2, propertyId: 1 },
    });
  });

  it('GET /inquiries/my -> 200', async () => {
    prisma.inquiry.findMany.mockResolvedValue([]);
    const token = tokenFor(app, { id: 2 });
    await request(app.getHttpServer())
      .get('/inquiries/my')
      .set('Authorization', bearer(token))
      .expect(200);
    expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { senderId: 2 } }),
    );
  });

  it('GET /inquiries/received guard`siz -> 401', async () => {
    await request(app.getHttpServer()).get('/inquiries/received').expect(401);
  });

  it("GET /inquiries/received limit>50 -> 400", async () => {
    const token = tokenFor(app, { id: 2 });
    await request(app.getHttpServer())
      .get('/inquiries/received?limit=100')
      .set('Authorization', bearer(token))
      .expect(400);
  });

  it('GET /inquiries/received -> 200 (egasi bo`yicha filtr)', async () => {
    prisma.inquiry.findMany.mockResolvedValue([]);
    prisma.inquiry.count.mockResolvedValue(0);
    const token = tokenFor(app, { id: 2 });
    const res = await request(app.getHttpServer())
      .get('/inquiries/received?page=1&limit=5')
      .set('Authorization', bearer(token))
      .expect(200);
    expect(res.body.meta.limit).toBe(5);
    expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { property: { ownerId: 2 } } }),
    );
  });

  it('PATCH /inquiries/abc/read -> 400', async () => {
    const token = tokenFor(app, { id: 2 });
    await request(app.getHttpServer())
      .patch('/inquiries/abc/read')
      .set('Authorization', bearer(token))
      .expect(400);
  });

  it('PATCH /inquiries/:id/read boshqa user -> 403', async () => {
    prisma.inquiry.findUnique.mockResolvedValue({ id: 3, readAt: null, property: { ownerId: 1 } });
    const token = tokenFor(app, { id: 2 });
    await request(app.getHttpServer())
      .patch('/inquiries/3/read')
      .set('Authorization', bearer(token))
      .expect(403);
  });

  it('PATCH /inquiries/:id/read egasi -> 200', async () => {
    prisma.inquiry.findUnique.mockResolvedValue({ id: 3, readAt: null, property: { ownerId: 2 } });
    prisma.inquiry.update.mockResolvedValue({ id: 3, readAt: new Date().toISOString() });
    const token = tokenFor(app, { id: 2 });
    const res = await request(app.getHttpServer())
      .patch('/inquiries/3/read')
      .set('Authorization', bearer(token))
      .expect(200);
    expect(res.body.readAt).toBeTruthy();
  });
});
