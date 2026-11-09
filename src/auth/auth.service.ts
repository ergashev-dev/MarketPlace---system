import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import bcrypt from 'bcrypt';
import { RegisterDTO } from './dto/register.dto.js';
import { LoginDTO } from './dto/login.dto.js';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service.js';
import { isEmailVerificationEnabled } from '../common/app-config.js';
import { BadRequestException } from '@nestjs/common';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  private get adminEmail(): string | undefined {
    return process.env.ADMIN_EMAIL?.trim().toLowerCase() || undefined;
  }

  private isAdminEmail(email: string): boolean {
    return !!this.adminEmail && email.trim().toLowerCase() === this.adminEmail;
  }

  // Ilova ishga tushganda: ADMIN_EMAIL egasi ro'yxatdan o'tgan bo'lsa, ADMIN qilinadi
  async onApplicationBootstrap() {
    if (!this.adminEmail) {
      this.logger.warn('ADMIN_EMAIL berilmagan — admin tayinlanmadi');
      return;
    }
    const { count } = await this.prisma.user.updateMany({
      where: {
        email: { equals: this.adminEmail, mode: 'insensitive' },
        role: { not: 'ADMIN' },
      },
      data: { role: 'ADMIN' },
    });
    if (count > 0) {
      this.logger.log(`${this.adminEmail} ADMIN qilib tayinlandi`);
    }
  }

  // Frontend bannerni ko'rsatishi uchun: tasdiqlash yoqilgan va user hali tasdiqlamagan
  private withVerificationFlag<T extends { role: Role; emailVerifiedAt: Date | null }>(
    user: T,
  ) {
    return {
      ...user,
      emailVerificationRequired:
        isEmailVerificationEnabled() &&
        user.role !== 'ADMIN' &&
        !user.emailVerifiedAt,
    };
  }

  generateToken(user: { id: number; email: string; role: Role }) {
    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return token;
  }

  async register(body: RegisterDTO) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      throw new ConflictException("Email ro'yxatdan o'tgan");
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
        passwordHash: hashedPassword,
        ...(this.isAdminEmail(body.email) && { role: 'ADMIN' as Role }),
      },
    });

    // Xat yuborilmasa ham ro'yxatdan o'tish bekor bo'lmaydi: keyin qayta yuborish mumkin
    void this.issueVerification(user.id, user.email, user.fullName);

    const { passwordHash, ...userWithoutPassword } = user;
    return this.withVerificationFlag(userWithoutPassword);
  }

  /** Yangi token yaratadi (eskisi o'chadi) va xat yuboradi. */
  private async issueVerification(userId: number, email: string, fullName: string) {
    const token = randomBytes(32).toString('hex');
    const data = {
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
      sentAt: new Date(),
    };
    await this.prisma.emailVerification.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return this.mailService.sendVerification(email, fullName, token);
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerification.findUnique({
      where: { tokenHash: sha256(token) },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException(
        "Havola yaroqsiz yoki muddati tugagan. Yangisini so'rang.",
      );
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerification.delete({ where: { id: record.id } }),
    ]);
    return { message: 'Email tasdiqlandi' };
  }

  async resendVerification(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { emailVerification: true },
    });
    if (!user) {
      throw new NotFoundException('User mavjud emas');
    }
    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email allaqachon tasdiqlangan');
    }
    const last = user.emailVerification?.sentAt;
    if (last && Date.now() - last.getTime() < RESEND_COOLDOWN_MS) {
      throw new BadRequestException(
        "Xat yaqinda yuborilgan. Bir daqiqadan keyin qayta urinib ko'ring.",
      );
    }
    const sent = await this.issueVerification(user.id, user.email, user.fullName);
    if (!sent) {
      throw new BadRequestException(
        "Xat yuborib bo'lmadi. Birozdan keyin qayta urinib ko'ring.",
      );
    }
    return { message: 'Tasdiqlash xati yuborildi' };
  }

  async login(body: LoginDTO) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: body.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email yoki parol noto‘g‘ri');
    }

    const isPasswordCorrect = await bcrypt.compare(
      body.password,
      user.passwordHash,
    );

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('Email yoki parol noto‘g‘ri');
    }
    if (user.blockedAt) {
      throw new ForbiddenException('Hisobingiz bloklangan. Qo\'llab-quvvatlashga murojaat qiling.');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const { passwordHash, ...userWithoutPassword } = user;

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      message: 'Login muvaffaqiyatli',
      user: this.withVerificationFlag(userWithoutPassword),
      accessToken: token,
    };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User mavjud emas');
    }

    const { passwordHash, ...userWithoutPassword } = user;

    return this.withVerificationFlag(userWithoutPassword);
  }
}
