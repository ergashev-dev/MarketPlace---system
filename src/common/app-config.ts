const DEFAULT_JWT_EXPIRES_IN = '1d';

/**
 * JWT_EXPIRES_IN qiymatini jsonwebtoken kutgan formatga o'tkazadi.
 * - bo'sh/berilmagan -> '1d'
 * - faqat raqam ("3600") -> soniya (jsonwebtoken raqamsiz stringni millisekund deb o'qiydi,
 *   shuning uchun Number'ga o'tkazamiz)
 * - "15m", "1d", "7 days" kabi -> o'zgarishsiz
 */
export function getJwtExpiresIn(
  env: NodeJS.ProcessEnv = process.env,
): string | number {
  const raw = env.JWT_EXPIRES_IN?.trim();
  if (!raw) {
    return DEFAULT_JWT_EXPIRES_IN;
  }
  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }
  return raw;
}

/**
 * CORS_ORIGINS (vergul bilan ajratilgan) ni `origin` opsiyasiga aylantiradi.
 * - ro'yxat berilgan -> faqat shu origin'lar
 * - bo'sh + production -> hech biri (false)
 * - bo'sh + development -> hammasi (true)
 */
export function getCorsOrigin(
  env: NodeJS.ProcessEnv = process.env,
): string[] | boolean {
  const origins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (origins.length > 0) {
    return origins;
  }
  return env.NODE_ENV !== 'production';
}

/**
 * TRUST_PROXY: reverse proxy (nginx) ortida throttler haqiqiy IP'ni ko'rishi uchun.
 * Berilmasa o'chiq (X-Forwarded-For soxtalashtirilishining oldini oladi).
 * "true"/"false", proxy'lar soni ("1") yoki Express'ning boshqa qiymati bo'lishi mumkin.
 */
export function getTrustProxy(
  env: NodeJS.ProcessEnv = process.env,
): boolean | number | string | undefined {
  const raw = env.TRUST_PROXY?.trim();
  if (!raw) {
    return undefined;
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}

/**
 * Email tasdiqlash faqat SMTP sozlangan bo'lsagina majburiy: aks holda foydalanuvchi
 * xat ololmaydi va e'lon joylay olmay qoladi.
 */
export function isEmailVerificationEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return !!env.SMTP_HOST;
}
