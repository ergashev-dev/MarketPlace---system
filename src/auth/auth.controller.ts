import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDTO } from './dto/register.dto.js';
import { LoginDTO } from './dto/login.dto.js';
import { VerifyEmailDTO } from './dto/verify-email.dto.js';
import { JwtAuthGuard } from './jwt-auth/jwt-auth.guard.js';
import { Throttle } from '@nestjs/throttler';
import { LOGIN_THROTTLE, REGISTER_THROTTLE } from '../common/throttle.config.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle(REGISTER_THROTTLE)
  @Post('register')
  register(@Body() body: RegisterDTO) {
    return this.authService.register(body);
  }

  @Throttle(LOGIN_THROTTLE)
  @Post('login')
  login(@Body() body: LoginDTO) {
    return this.authService.login(body);
  }

  @Throttle(LOGIN_THROTTLE)
  @Post('verify-email')
  verifyEmail(@Body() body: VerifyEmailDTO) {
    return this.authService.verifyEmail(body.token);
  }

  @Throttle(REGISTER_THROTTLE)
  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  resendVerification(@Req() request: any) {
    return this.authService.resendVerification(request.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: any) {
    return this.authService.me(request.user.id);
  }
}
