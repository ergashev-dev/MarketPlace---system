import { Controller, Delete, Get, Patch, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LOGIN_THROTTLE } from '../common/throttle.config.js';
import { ChangePasswordDTO, DeleteAccountDTO } from './dto/account.dto.js';
import { UsersService } from './users.service.js';
import { UpdateUserDTO } from './dto/update-user.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Req() req: any) {
    return this.usersService.getMe(req.user.id);
  }

  @Patch('me')
  updateMe(@Req() req: any, @Body() dto: UpdateUserDTO) {
    return this.usersService.updateMe(req.user.id, dto);
  }

  @Throttle(LOGIN_THROTTLE)
  @Post('me/password')
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDTO) {
    return this.usersService.changePassword(req.user.id, dto);
  }

  @Throttle(LOGIN_THROTTLE)
  @Delete('me')
  deleteMe(@Req() req: any, @Body() dto: DeleteAccountDTO) {
    return this.usersService.deleteAccount(req.user.id, dto);
  }
}
