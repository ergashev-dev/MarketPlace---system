import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../test/helpers/app.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GLOBAL_THROTTLE } from '../common/throttle.config.js';

describe('AuthController throttling (A6)', () => {
  let app: INestApplication;
  const authService = {
    login: vi.fn().mockResolvedValue({ accessToken: 't' }),
    register: vi.fn().mockResolvedValue({ id: 1 }),
  };

  beforeEach(async () => {
    app = await createTestApp({
      imports: [ThrottlerModule.forRoot([GLOBAL_THROTTLE])],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    });
  });
  afterEach(() => app.close());

  it('/auth/login: 10 so`rovdan keyin 429', async () => {
    const send = () =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'a@b.uz', password: '12345678' });
    for (let i = 0; i < 10; i++) {
      await send().expect(201);
    }
    await send().expect(429);
  });

  it('/auth/register: 5 so`rovdan keyin 429', async () => {
    const send = () =>
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ fullName: 'Ali Vali', email: 'a@b.uz', password: '12345678' });
    for (let i = 0; i < 5; i++) {
      await send().expect(201);
    }
    await send().expect(429);
  });
});
