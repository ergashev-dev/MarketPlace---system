import { Module } from '@nestjs/common';
import { InquiriesController } from './inquiries.controller.js';
import { InquiriesService } from './inquiries.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  controllers: [InquiriesController],
  providers: [InquiriesService],
  imports: [PrismaModule, AuthModule]
})
export class InquiriesModule {}
