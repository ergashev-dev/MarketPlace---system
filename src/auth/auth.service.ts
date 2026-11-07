import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import bcrypt from 'bcrypt';
import { RegisterDTO } from './dto/register.dto.js';
import { LoginDTO } from './dto/login.dto.js';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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
