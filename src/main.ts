import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import 'dotenv/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { getCorsOrigin, getTrustProxy } from './common/app-config.js';
import { createValidationPipe } from './common/validation-pipe.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const trustProxy = getTrustProxy();
  if (trustProxy !== undefined) {
    app.set('trust proxy', trustProxy);
  }

  app.enableCors({ origin: getCorsOrigin() });

  app.useGlobalPipes(createValidationPipe());
  await app.listen(process.env.PORT ?? 3000, process.env.HOST ?? '127.0.0.1');
}
await bootstrap();
