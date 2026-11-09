import { Module } from '@nestjs/common';
import { PropertiesController, SitemapController } from './properties.controller.js';
import { PropertiesService } from './properties.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MailModule } from '../mail/mail.module.js';
import { ExpiryReminderService } from './expiry-reminder.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule, MailModule],
  controllers: [PropertiesController, SitemapController],
  providers: [PropertiesService, ExpiryReminderService]
})
export class PropertiesModule {}
