import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UpdateRoleDTO } from './dto/update-role.dto.js';
import { AdminService } from './admin.service.js';
import { AdminQueryDTO } from './dto/admin-query.dto.js';
import { UpdateStatusDTO } from './dto/update-status.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles/roles.guard.js';
import { Roles } from '../auth/roles/roles.decorator.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('properties')
  getProperties(@Query() query: AdminQueryDTO) {
    return this.adminService.getProperties(query);
  }

  @Patch('properties/:id/status')
  updateStatus(@Param('id') id: number, @Body() body: UpdateStatusDTO) {
    return this.adminService.updateStatus(id, body);
  }

  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Patch('users/:id/role')
  updateRole(
    @Param('id') id: number,
    @Body() body: UpdateRoleDTO,
    @Req() req: any,
  ) {
    return this.adminService.updateRole(id, body, req.user.id);
  }
}