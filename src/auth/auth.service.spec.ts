import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { AuthService } from './auth.service.js';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

function setup() {
  const prisma: any = {
    emailVerification: {
      findUnique: vi.fn(),
      upsert: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockReturnValue('del'),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn().mockReturnValue('upd'),
      create: vi.fn(),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  const mail: any = { sendVerification: vi.fn().mockResolvedValue(true) };
  const jwt: any = { sign: vi.fn() };
  return { prisma, mail, service: new AuthService(prisma, jwt, mail) };
}

describe('AuthService email verification', () => {
  it('verifies a valid token and consumes it', async () => {
    const { prisma, service } = setup();
    const token = 'a'.repeat(64);
    prisma.emailVerification.findUnique.mockResolvedValue({
      id: 5,
      userId: 9,
      expiresAt: new Date(Date.now() + 1000),
    });
    await expect(service.verifyEmail(token)).resolves.toEqual({
      message: 'Email tasdiqlandi',
    });
    expect(prisma.emailVerification.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: sha(token) },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('rejects unknown and expired tokens', async () => {
    const { prisma, service } = setup();
    prisma.emailVerification.findUnique.mockResolvedValue(null);
    await expect(service.verifyEmail('b'.repeat(64))).rejects.toBeInstanceOf(BadRequestException);
    prisma.emailVerification.findUnique.mockResolvedValue({
      id: 1,
      userId: 1,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(service.verifyEmail('b'.repeat(64))).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('resend: refuses verified users and respects cooldown', async () => {
    const { prisma, mail, service } = setup();
    prisma.user.findUnique.mockResolvedValue({ id: 1, emailVerifiedAt: new Date() });
    await expect(service.resendVerification(1)).rejects.toBeInstanceOf(BadRequestException);

    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'a@b.uz',
      fullName: 'A B',
      emailVerifiedAt: null,
      emailVerification: { sentAt: new Date() },
    });
    await expect(service.resendVerification(1)).rejects.toBeInstanceOf(BadRequestException);
    expect(mail.sendVerification).not.toHaveBeenCalled();
  });

  it('resend: sends a fresh token when allowed', async () => {
    const { prisma, mail, service } = setup();
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'a@b.uz',
      fullName: 'A B',
      emailVerifiedAt: null,
      emailVerification: { sentAt: new Date(Date.now() - 120_000) },
    });
    await expect(service.resendVerification(1)).resolves.toEqual({
      message: 'Tasdiqlash xati yuborildi',
    });
    const token = mail.sendVerification.mock.calls[0][2];
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    // bazaga faqat hash yoziladi, tokenning o'zi emas
    const saved = prisma.emailVerification.upsert.mock.calls[0][0].create;
    expect(saved.tokenHash).toBe(sha(token));
    expect(JSON.stringify(saved)).not.toContain(token);
  });

  it('resend: unknown user', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.resendVerification(1)).rejects.toBeInstanceOf(NotFoundException);
  });
});
