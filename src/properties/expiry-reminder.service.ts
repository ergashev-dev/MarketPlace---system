import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { PropertiesService } from './properties.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { MailService } from '../mail/mail.service.js';

const SIX_HOURS = 6 * 60 * 60 * 1000;

@Injectable()
export class ExpiryReminderService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ExpiryReminderService.name);
  private timer?: NodeJS.Timeout;
  private first?: NodeJS.Timeout;

  constructor(
    private readonly properties: PropertiesService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  onApplicationBootstrap() {
    // Test va CLI muhitida ishlamasin
    if (process.env.NODE_ENV === 'test' || process.env.DISABLE_JOBS === 'true') return;
    this.first = setTimeout(() => void this.run(), 60_000);
    this.timer = setInterval(() => void this.run(), SIX_HOURS);
    this.first.unref();
    this.timer.unref();
  }

  onApplicationShutdown() {
    clearTimeout(this.first);
    clearInterval(this.timer);
  }

  async run() {
    try {
      const items = await this.properties.findExpiringSoon(5);
      for (const p of items) {
        const text = `E'loningiz muddati tugayapti: ${p.title}. "Muddatni uzaytirish" tugmasini bosing.`;
        await this.notifications.notify(p.ownerId, 'EXPIRING', text, '/dashboard');
        if (this.mail.configured) {
          await this.mail.send(
            p.owner.email,
            "Joylab: e'loningiz muddati tugayapti",
            `${text}\n${this.mail.siteUrl}/dashboard`,
            `<p>${text.replace(/[<>&]/g, '')}</p><p><a href="${this.mail.siteUrl}/dashboard">Mening e'lonlarim</a></p>`,
          );
        }
        await this.properties.markReminded(p.id);
      }
      if (items.length) this.logger.log(`${items.length} ta eslatma yuborildi`);
    } catch (err) {
      this.logger.error(`Eslatma ishida xato: ${(err as Error).message}`);
    }
  }
}
