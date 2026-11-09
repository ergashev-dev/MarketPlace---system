import type { INestApplication } from '@nestjs/common';
import { existsSync, readdirSync, unlinkSync } from 'fs';
import request from 'supertest';
import { createTestApp, tokenFor, bearer } from '../../test/helpers/app.js';
import { PropertiesController } from './properties.controller.js';
import { PropertiesService } from './properties.service.js';

// 1x1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const UPLOAD_DIR = './uploads/properties';

describe('PropertiesController', () => {
  let app: INestApplication;
  const service = {
    addImage: vi.fn(),
    getProperties: vi.fn().mockResolvedValue({ data: [], meta: {} }),
  };
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createTestApp({
      controllers: [PropertiesController],
      providers: [{ provide: PropertiesService, useValue: service }],
    });
    token = tokenFor(app, { id: 1 });
  });
  afterEach(() => app.close());

  const files = () => (existsSync(UPLOAD_DIR) ? readdirSync(UPLOAD_DIR) : []);

  describe('A6: magic bytes', () => {
    it("MIME image/png, lekin mazmuni matn -> 400 va fayl diskda qolmaydi", async () => {
      const before = files();
      const res = await request(app.getHttpServer())
        .post('/properties/1/images')
        .set('Authorization', bearer(token))
        .attach('image', Buffer.from('<script>alert(1)</script>'), {
          filename: 'evil.png',
          contentType: 'image/png',
        })
        .expect(400);
      expect(res.body.message).toContain('jpg, png yoki webp');
      expect(service.addImage).not.toHaveBeenCalled();
      expect(files()).toEqual(before);
    });

    it("MIME image/jpeg, lekin mazmuni PNG -> 400 (e'lon qilingan MIME mos kelmaydi)", async () => {
      await request(app.getHttpServer())
        .post('/properties/1/images')
        .set('Authorization', bearer(token))
        .attach('image', PNG, { filename: 'a.jpg', contentType: 'image/jpeg' })
        .expect(400);
      expect(service.addImage).not.toHaveBeenCalled();
    });

    it("ruxsat etilmagan MIME (text/html) -> 400", async () => {
      await request(app.getHttpServer())
        .post('/properties/1/images')
        .set('Authorization', bearer(token))
        .attach('image', Buffer.from('x'), { filename: 'a.html', contentType: 'text/html' })
        .expect(400);
    });

    it('haqiqiy PNG -> service chaqiriladi, kengaytma MIME`dan (.png)', async () => {
      service.addImage.mockResolvedValue({ id: 1 });
      await request(app.getHttpServer())
        .post('/properties/1/images')
        .set('Authorization', bearer(token))
        .attach('image', PNG, { filename: 'photo.html.png', contentType: 'image/png' })
        .expect(201);
      const saved = service.addImage.mock.calls[0][2];
      expect(saved.filename).toMatch(/\.png$/);
      unlinkSync(saved.path);
    });

    it("service xato qaytarsa (masalan egasi emas) yuklangan fayl o'chiriladi", async () => {
      service.addImage.mockRejectedValue(new Error('boom'));
      const before = files();
      await request(app.getHttpServer())
        .post('/properties/1/images')
        .set('Authorization', bearer(token))
        .attach('image', PNG, { filename: 'a.png', contentType: 'image/png' })
        .expect(500);
      expect(files()).toEqual(before);
    });
  });

  describe('B2: currency query validation', () => {
    it.each(['USD', 'UZS'])('currency=%s -> 200', async (currency) => {
      await request(app.getHttpServer())
        .get(`/properties?currency=${currency}&minPrice=1`)
        .expect(200);
      expect(service.getProperties).toHaveBeenCalledWith(
        expect.objectContaining({ currency, minPrice: 1 }),
      );
    });

    it("currency=EUR -> 400", async () => {
      await request(app.getHttpServer()).get('/properties?currency=EUR').expect(400);
    });

    it('currency yo`q -> 200 (orqaga moslik)', async () => {
      await request(app.getHttpServer()).get('/properties?minPrice=1&maxPrice=9').expect(200);
    });
  });
});
