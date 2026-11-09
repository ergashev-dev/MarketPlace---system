import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.list(req.user.id);
  }

  @Get('unread-count')
  unreadCount(@Req() req: any) {
    return this.service.unreadCount(req.user.id);
  }

  @Patch('read-all')
  readAll(@Req() req: any) {
    return this.service.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  read(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.markRead(req.user.id, id);
  }
}
