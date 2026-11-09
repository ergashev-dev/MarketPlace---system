import { NotificationsService } from '../notifications/notifications.service.js';
import { BadRequestException } from '@nestjs/common';
import { PropertiesService } from './properties.service.js';

vi.mock('fs/promises', () => ({ unlink: vi.fn().mockResolvedValue(undefined) }));

function makePrisma() {
  const prisma: any = {
    property: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn((args) => ({ __op: 'property.update', args })),
      create: vi.fn(),
    },
    propertyImage: {
      count: vi.fn().mockResolvedValue(2),
      create: vi.fn((args) => ({ __op: 'image.create', args })),
      delete: vi.fn((args) => ({ __op: 'image.delete', args })),
      findUnique: vi.fn(),
    },
    category: { findUnique: vi.fn().mockResolvedValue({ id: 1 }) },
    $transaction: vi.fn(async (ops: any[]) => ops.map((o) => ({ ...o, done: true }))),
  };
  return prisma;
}

const file = { filename: 'x.png' } as any;

describe('PropertiesService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: PropertiesService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PropertiesService(prisma, { notify: vi.fn() } as any);
  });

  describe('A3: rasm o`zgarsa moderatsiya', () => {
    it.each(['APPROVED', 'REJECTED'])(
      "rasm qo'shilganda %s -> PENDING (rejectReason null), bitta transaction'da",
      async (status) => {
        prisma.property.findUnique.mockResolvedValue({ id: 5, ownerId: 1, status });

        await service.addImage(5, 1, file);

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        const ops = prisma.$transaction.mock.calls[0][0];
        expect(ops.map((o: any) => o.__op)).toEqual(['image.create', 'property.update']);
        expect(prisma.property.update).toHaveBeenCalledWith({
          where: { id: 5 },
          data: { status: 'PENDING', rejectReason: null },
        });
      },
    );

    it("PENDING e'londa status yangilanmaydi", async () => {
      prisma.property.findUnique.mockResolvedValue({ id: 5, ownerId: 1, status: 'PENDING' });
      await service.addImage(5, 1, file);
      expect(prisma.property.update).not.toHaveBeenCalled();
      expect(prisma.propertyImage.create).toHaveBeenCalled();
    });

    it.each(['APPROVED', 'REJECTED'])('rasm o`chirilganda %s -> PENDING', async (status) => {
      prisma.property.findUnique.mockResolvedValue({ id: 5, ownerId: 1, status });
      prisma.propertyImage.findUnique.mockResolvedValue({ id: 9, propertyId: 5, url: '/uploads/properties/x.png' });

      await service.deleteImage(5, 9, 1);

      const ops = prisma.$transaction.mock.calls[0][0];
      expect(ops.map((o: any) => o.__op)).toEqual(['image.delete', 'property.update']);
      expect(prisma.property.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { status: 'PENDING', rejectReason: null },
      });
    });

    it('egasi bo`lmasa hech narsa o`zgarmaydi', async () => {
      prisma.property.findUnique.mockResolvedValue({ id: 5, ownerId: 2, status: 'APPROVED' });
      await expect(service.addImage(5, 1, file)).rejects.toThrow();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('A4: tahrirlash rejectReason ni tozalaydi', () => {
    it('updateProperty status=PENDING, rejectReason=null', async () => {
      prisma.property.findUnique.mockResolvedValue({ id: 5, ownerId: 1, status: 'REJECTED', rejectReason: 'Rasm yo`q' });
      await service.updateProperty(5, 1, { title: 'Yangi sarlavha' });
      expect(prisma.property.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { title: 'Yangi sarlavha', status: 'PENDING', rejectReason: null },
      });
    });

    it('getMyProperties select cheklamaydi (rejectReason qaytadi)', async () => {
      prisma.property.findMany.mockResolvedValue([{ id: 1, status: 'REJECTED', rejectReason: 'Sabab' }]);
      const res = await service.getMyProperties(1);
      expect(res[0].rejectReason).toBe('Sabab');
      const arg = prisma.property.findMany.mock.calls[0][0];
      expect(arg.select).toBeUndefined();
      expect(arg.where).toEqual({ ownerId: 1 });
    });
  });

  describe('B2: currency filtri', () => {
    const whereOf = () => prisma.property.findMany.mock.calls[0][0].where;

    it('currency + minPrice/maxPrice -> ikkalasi where`da', async () => {
      await service.getProperties({ currency: 'UZS', minPrice: 10, maxPrice: 100 });
      expect(whereOf()).toMatchObject({ currency: 'UZS', price: { gte: 10, lte: 100 } });
    });

    it('currency berilmasa valyuta filtri qo`shilmaydi (orqaga moslik)', async () => {
      await service.getProperties({ minPrice: 10, maxPrice: 100 });
      expect(whereOf()).not.toHaveProperty('currency');
      expect(whereOf().price).toEqual({ gte: 10, lte: 100 });
    });

    it('minPrice > maxPrice -> 400', async () => {
      await expect(service.getProperties({ minPrice: 5, maxPrice: 1 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
