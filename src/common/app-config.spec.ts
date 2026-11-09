import { getCorsOrigin, getJwtExpiresIn, getTrustProxy } from './app-config.js';

describe('getJwtExpiresIn (A5)', () => {
  it("default '1d'", () => {
    expect(getJwtExpiresIn({})).toBe('1d');
    expect(getJwtExpiresIn({ JWT_EXPIRES_IN: '  ' })).toBe('1d');
  });
  it("env qiymatini ishlatadi", () => {
    expect(getJwtExpiresIn({ JWT_EXPIRES_IN: '15m' })).toBe('15m');
    expect(getJwtExpiresIn({ JWT_EXPIRES_IN: '7d' })).toBe('7d');
  });
  it("faqat raqam bo'lsa soniya (jsonwebtoken ms deb o'qimasligi uchun)", () => {
    expect(getJwtExpiresIn({ JWT_EXPIRES_IN: '3600' })).toBe(3600);
  });
});

describe('getCorsOrigin (A6)', () => {
  it("ro'yxat berilsa faqat shular (trim, trailing slash olib tashlanadi)", () => {
    expect(
      getCorsOrigin({ CORS_ORIGINS: ' https://a.uz/ , https://b.uz,,', NODE_ENV: 'production' }),
    ).toEqual(['https://a.uz', 'https://b.uz']);
  });
  it("bo'sh + development -> hammasi", () => {
    expect(getCorsOrigin({})).toBe(true);
    expect(getCorsOrigin({ NODE_ENV: 'development', CORS_ORIGINS: '' })).toBe(true);
  });
  it("bo'sh + production -> hech biri", () => {
    expect(getCorsOrigin({ NODE_ENV: 'production' })).toBe(false);
    expect(getCorsOrigin({ NODE_ENV: 'production', CORS_ORIGINS: ' , ' })).toBe(false);
  });
});

describe('getTrustProxy', () => {
  it('parse qiladi', () => {
    expect(getTrustProxy({})).toBeUndefined();
    expect(getTrustProxy({ TRUST_PROXY: '1' })).toBe(1);
    expect(getTrustProxy({ TRUST_PROXY: 'true' })).toBe(true);
    expect(getTrustProxy({ TRUST_PROXY: 'loopback' })).toBe('loopback');
  });
});
