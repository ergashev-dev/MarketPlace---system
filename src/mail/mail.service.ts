import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  private get from() {
    return process.env.MAIL_FROM || 'Joylab <info@joylab.uz>';
  }

  get siteUrl() {
    return (process.env.SITE_URL || 'https://joylab.uz').replace(/\/+$/, '');
  }

  get configured() {
    return !!process.env.SMTP_HOST;
  }

  private getTransporter() {
    if (!this.transporter) {
      const host = process.env.SMTP_HOST || '127.0.0.1';
      const local = ['127.0.0.1', 'localhost', '::1'].includes(host);
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 25),
        secure: process.env.SMTP_SECURE === 'true',
        // Lokal Exim (127.0.0.1:25) parolsiz qabul qiladi; masofaviy SMTP uchun login/parol
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        // Lokal Exim sertifikati hostname bilan mos kelmasligi mumkin
        tls: local ? { rejectUnauthorized: false } : undefined,
      });
    }
    return this.transporter;
  }

  /** Xat yuborilsa true. SMTP sozlanmagan yoki xato bo'lsa false (ilova yiqilmaydi). */
  async send(to: string, subject: string, text: string, html: string) {
    if (!this.configured) {
      this.logger.warn(`SMTP sozlanmagan (SMTP_HOST), xat yuborilmadi: ${to}`);
      return false;
    }
    try {
      await this.getTransporter().sendMail({ from: this.from, to, subject, text, html });
      return true;
    } catch (err) {
      this.logger.error(`Xat yuborilmadi (${to}): ${(err as Error).message}`);
      return false;
    }
  }

  sendVerification(to: string, fullName: string, token: string) {
    const link = `${this.siteUrl}/verify-email?token=${token}`;
    const name = escapeHtml(fullName);
    return this.send(
      to,
      'Joylab: emailingizni tasdiqlang',
      `Salom, ${fullName}!\n\nEmailingizni tasdiqlash uchun havolaga o'ting (24 soat amal qiladi):\n${link}\n\nAgar siz ro'yxatdan o'tmagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.`,
      `<p>Salom, ${name}!</p><p>Emailingizni tasdiqlash uchun tugmani bosing (havola 24 soat amal qiladi):</p>` +
        `<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#06565e;color:#fff;border-radius:8px;text-decoration:none">Emailni tasdiqlash</a></p>` +
        `<p style="color:#666;font-size:13px">Tugma ishlamasa, havolani brauzerga joylang:<br>${link}</p>` +
        `<p style="color:#666;font-size:13px">Agar siz ro'yxatdan o'tmagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.</p>`,
    );
  }
}
