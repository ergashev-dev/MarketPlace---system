import type { INestApplication, ModuleMetadata } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { createValidationPipe } from '../../src/common/validation-pipe.js';

export const TEST_JWT_SECRET = 'test-secret';

export async function createTestApp(
  metadata: ModuleMetadata,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    ...metadata,
    imports: [
      JwtModule.register({ secret: TEST_JWT_SECRET }),
      ...(metadata.imports ?? []),
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(createValidationPipe());
  await app.init();
  return app;
}

export function tokenFor(
  app: INestApplication,
  user: { id: number; role?: 'USER' | 'ADMIN' },
): string {
  return app
    .get(JwtService)
    .sign({ id: user.id, email: `u${user.id}@test.uz`, role: user.role ?? 'USER' });
}

export const bearer = (token: string) => `Bearer ${token}`;
