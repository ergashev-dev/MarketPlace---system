import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDTO } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

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
}
