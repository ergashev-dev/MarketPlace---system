import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MailModule } from '../mail/mail.module.js';
import { JwtModule } from '@nestjs/jwt';
import type { JwtModuleOptions } from '@nestjs/jwt';
import { getJwtExpiresIn } from '../common/app-config.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [
    PrismaModule,
    MailModule,
    // registerAsync: factory ilova ishga tushganda (dotenv yuklangandan keyin) chaqiriladi
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET .env faylida berilmagan');
        }
        return {
          secret,
          signOptions: {
            expiresIn: getJwtExpiresIn() as NonNullable<
              JwtModuleOptions['signOptions']
            >['expiresIn'],
          },
        };
      },
    }),
  ],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
