import { CATEGORIES, seed } from './seed.js';

function makePrisma() {
  const users = new Map<string, any>();
  const categories = new Map<string, any>();
  return {
    users,
    categories,
    category: {
      upsert: vi.fn(async ({ where, create }) => {
        if (!categories.has(where.slug)) categories.set(where.slug, create);
        return categories.get(where.slug);
      }),
    },
    user: {
      findUnique: vi.fn(async ({ where }) => users.get(where.email) ?? null),
      create: vi.fn(async ({ data }) => {
        users.set(data.email, data);
        return data;
      }),
      update: vi.fn(async ({ where, data }) => {
        users.set(where.email, { ...users.get(where.email), ...data });
      }),
    },
  };
}

const env = { SEED_ADMIN_EMAIL: ' Admin@Uyma.uz ', SEED_ADMIN_PASSWORD: 'Sup3rSecret!' };
const quiet = () => undefined;

describe('seed (A2)', () => {
  it('4 ta kategoriya slug bilan, upsert orqali', async () => {
    const prisma = makePrisma();
    await seed(prisma as any, env, quiet);
    expect(CATEGORIES.map((c) => c.name)).toEqual(['Kvartira', 'Hovli', 'Ofis', 'Yer uchastka']);
    expect([...prisma.categories.keys()]).toEqual(['kvartira', 'hovli', 'ofis', 'yer-uchastka']);
    expect(prisma.category.upsert).toHaveBeenCalledTimes(4);
  });

  it('admin: email env`dan (lowercase), parol bcrypt hash, role ADMIN', async () => {
    const prisma = makePrisma();
    await seed(prisma as any, env, quiet);
    const admin = prisma.users.get('admin@uyma.uz');
    expect(admin.role).toBe('ADMIN');
    expect(admin.passwordHash).not.toContain('Sup3rSecret!');
    expect(admin.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('ikki marta ishga tushirsa xato yo`q, dublikat yo`q, parol o`zgarmaydi', async () => {
    const prisma = makePrisma();
    await seed(prisma as any, env, quiet);
    const hash = prisma.users.get('admin@uyma.uz').passwordHash;
    await seed(prisma as any, { ...env, SEED_ADMIN_PASSWORD: 'BoshqaParol123' }, quiet);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(prisma.users.get('admin@uyma.uz').passwordHash).toBe(hash);
    expect(prisma.categories.size).toBe(4);
  });

  it('mavjud oddiy user ADMIN ga ko`tariladi', async () => {
    const prisma = makePrisma();
    prisma.users.set('admin@uyma.uz', { email: 'admin@uyma.uz', role: 'USER', passwordHash: 'x' });
    await seed(prisma as any, env, quiet);
    expect(prisma.users.get('admin@uyma.uz').role).toBe('ADMIN');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('env berilmasa admin yaratilmaydi, kategoriyalar baribir yaratiladi', async () => {
    const prisma = makePrisma();
    await seed(prisma as any, {}, quiet);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.categories.size).toBe(4);
  });

  it('qisqa parol -> xato', async () => {
    const prisma = makePrisma();
    await expect(
      seed(prisma as any, { SEED_ADMIN_EMAIL: 'a@b.uz', SEED_ADMIN_PASSWORD: '123' }, quiet),
    ).rejects.toThrow(/kamida 8/);
  });
});
