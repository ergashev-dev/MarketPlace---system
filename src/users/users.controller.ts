import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';
import { updateUserDTO } from './dto/update-user.dto.js';

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) {}

    @UseGuards(JwtAuthGuard)
    @Get('me')
    getMe(@Req() req: any) {
        return this.usersService.getMe(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('me')
    updateMe(@Req() req: any, @Body() body: updateUserDTO) {
        return this.usersService.updateMe(req.user.id, body)
    }
}
