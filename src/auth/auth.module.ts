import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { JwtModule } from '@nestjs/jwt';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [
    PrismaModule,
    // registerAsync: factory ilova ishga tushganda (dotenv yuklangandan keyin) chaqiriladi
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET .env faylida berilmagan');
        }
        return { secret, signOptions: { expiresIn: '1h' } };
      },
    }),
  ],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
