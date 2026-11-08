import {
  ConflictException,
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

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
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
    const { passwordHash, ...userWithoutPassword } = user;

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      message: 'Login muvaffaqiyatli',
      user: userWithoutPassword,
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

    return userWithoutPassword;
  }
}
