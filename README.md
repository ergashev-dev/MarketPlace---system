# MarketPlace System (Joylab backend)

Ko'chmas mulk e-'lonlari uchun REST API. NestJS + Prisma (PostgreSQL), JWT autentifikatsiya, Swagger hujjatlari.

Frontend: [Joylab-Front](https://github.com/ergashev-dev/Joylab-Front)

## Imkoniyatlar

- **Auth** — ro'yxatdan o'tish, login (JWT), email tasdiqlash
- **Properties** — e'lonlar, rasm yuklash (`uploads/`), yopish, shikoyat qilish, muddati tugash eslatmasi
- **Categories**, **Favorites**, **Inquiries** (so'rovlar), **Notifications**
- **Admin panel** — rollar boshqaruvi, e'lon statuslari (rad etish sababi bilan), audit log
- Rate limiting (throttler), CORS sozlamalari, email yuborish (`nodemailer`)

## Talablar

- Node.js 20+
- PostgreSQL

## O'rnatish

```bash
npm install
cp .env.example .env     # qiymatlarni to'ldiring
npx prisma migrate deploy
npx prisma db seed       # birinchi ADMIN yaratish (ixtiyoriy)
```

### Muhim `.env` o'zgaruvchilari

| O'zgaruvchi | Izoh |
|---|---|
| `DATABASE_URL` | PostgreSQL ulanish manzili |
| `JWT_SECRET` | JWT imzo kaliti (kuchli qiymat qo'ying) |
| `JWT_EXPIRES_IN` | Token muddati (`15m`, `1d`, ...) |
| `ADMIN_EMAIL` | Shu email'li user avtomatik ADMIN bo'ladi |
| `CORS_ORIGINS` | Ruxsat etilgan originlar, vergul bilan |
| `TRUST_PROXY` | Nginx ortida bo'lsa proxy'lar soni (odatda `1`) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Seed uchun admin ma'lumotlari |

> `.env` faylini hech qachon repo'ga qo'shmang.

## Ishga tushirish

```bash
npm run start:dev        # development (watch)
npm run build && npm run start:prod
pm2 start ecosystem.config.cjs   # production (PORT 6735)
```

## Test va lint

```bash
npm test          # unit testlar (Vitest)
npm run test:e2e  # e2e testlar
npm run lint
```

## Loyiha tuzilmasi

```
src/
  auth/ users/ properties/ categories/ favorites/
  inquiries/ notifications/ admin/ audit/ mail/ common/ prisma/
prisma/             # schema, migrations, seed
uploads/            # yuklangan rasmlar (gitignore'da)
```
