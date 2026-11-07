import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports: [PrismaModule, AuthModule]
})
export class AdminModule {}
