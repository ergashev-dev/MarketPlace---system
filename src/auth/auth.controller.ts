import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDTO } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './jwt-auth/jwt-auth.guard.js';
import { request } from 'http';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDTO) {
    return this.authService.register(body);
  }

  @Post('lotin')
  login(@Body() body: LoginDto) {
    return this.authService.login(body)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: any) {
    return this.authService.me(request.user.id)
  }
}
