import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AuthModule } from './auth.module.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AuthModule JWT muddati (A5)', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  async function signAndDecode() {
    const moduleRef = await Test.createTestingModule({ imports: [AuthModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    const jwt = moduleRef.get(JwtService);
    const decoded: any = jwt.decode(jwt.sign({ id: 1 }));
    return decoded.exp - decoded.iat;
  }

  it('JWT_EXPIRES_IN berilmasa 1 kun', async () => {
    process.env.JWT_SECRET = 's';
    delete process.env.JWT_EXPIRES_IN;
    expect(await signAndDecode()).toBe(24 * 3600);
  });

  it('JWT_EXPIRES_IN=15m', async () => {
    process.env.JWT_SECRET = 's';
    process.env.JWT_EXPIRES_IN = '15m';
    expect(await signAndDecode()).toBe(15 * 60);
  });

  it('JWT_EXPIRES_IN=3600 (raqam) -> 3600 soniya', async () => {
    process.env.JWT_SECRET = 's';
    process.env.JWT_EXPIRES_IN = '3600';
    expect(await signAndDecode()).toBe(3600);
  });
});
