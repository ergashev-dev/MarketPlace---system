import { NotificationsService } from '../notifications/notifications.service.js';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service.js';
import { createTestApp, tokenFor, bearer } from '../../test/helpers/app.js';
import { GLOBAL_THROTTLE } from '../common/throttle.config.js';
import { InquiriesController } from './inquiries.controller.js';
import { InquiriesService } from './inquiries.service.js';

describe('Inquiry yuborish throttling (A6)', () => {
  let app: INestApplication;
  const prisma = {
    property: { findUnique: vi.fn().mockResolvedValue({ id: 1, ownerId: 1, status: 'APPROVED' }) },
    inquiry: { create: vi.fn().mockResolvedValue({ id: 1 }), findMany: vi.fn().mockResolvedValue([]) },
  };

  beforeEach(async () => {
    app = await createTestApp({
      imports: [ThrottlerModule.forRoot([GLOBAL_THROTTLE])],
      controllers: [InquiriesController],
      providers: [
        InquiriesService,
        { provide: NotificationsService, useValue: { notify: vi.fn() } },
                { provide: PrismaService, useValue: prisma },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    });
  });
  afterEach(() => app.close());

  it("5 ta murojaatdan keyin 429, boshqa endpoint'lar global limitda qoladi", async () => {
    const token = tokenFor(app, { id: 2 });
    const send = () =>
      request(app.getHttpServer())
        .post('/properties/1/inquiries')
        .set('Authorization', bearer(token))
        .send({ message: "Salom, bu e'lon haqida so'ramoqchiman", phone: '+998901234567' });

    for (let i = 0; i < 5; i++) {
      await send().expect(201);
    }
    await send().expect(429);

    await request(app.getHttpServer())
      .get('/inquiries/my')
      .set('Authorization', bearer(token))
      .expect(200);
  });
});
