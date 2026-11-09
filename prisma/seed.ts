import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

export const CATEGORIES = [
  { name: 'Kvartira', slug: 'kvartira' },
  { name: 'Hovli', slug: 'hovli' },
  { name: 'Ofis', slug: 'ofis' },
  { name: 'Yer uchastka', slug: 'yer-uchastka' },
] as const;

const MIN_PASSWORD_LENGTH = 8; // LoginDTO bilan bir xil, aks holda admin login qila olmaydi

type SeedEnv = Record<string, string | undefined>;

/**
 * Idempotent: ikki marta ishga tushirilsa ham xato bermaydi va dublikat yaratmaydi.
 * Admin ma'lumotlari faqat env'dan olinadi (SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD).
 */
export async function seed(
  prisma: PrismaClient,
  env: SeedEnv = process.env,
  log: (message: string) => void = console.log,
) {
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }
  log(`Kategoriyalar: ${CATEGORIES.length} ta (upsert)`);

  const email = env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    log('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD berilmagan — admin yaratilmadi');
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_ADMIN_PASSWORD kamida ${MIN_PASSWORD_LENGTH} belgi bo'lishi kerak`,
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Mavjud userning paroli o'zgartirilmaydi, faqat rol ADMIN qilinadi
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
    }
    log(`Admin mavjud: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      fullName: 'Admin',
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'ADMIN',
    },
  });
  log(`Admin yaratildi: ${email}`);
}

const isMain =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const prisma = new PrismaClient();
  try {
    await seed(prisma);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
