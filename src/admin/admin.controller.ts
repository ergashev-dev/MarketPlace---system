import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UpdateRoleDTO } from './dto/update-role.dto.js';
import { UpdatePropertyDTO } from '../properties/dto/update-property.dto.js';
import {
  AdminUsersQueryDTO,
  AuditQueryDTO,
  BlockUserDTO,
  BulkStatusDTO,
  ExpiryDTO,
} from './dto/admin-extra.dto.js';
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

  @Patch('properties/bulk-status')
  bulkStatus(@Body() body: BulkStatusDTO, @Req() req: any) {
    return this.adminService.bulkUpdateStatus(body, req.user.id);
  }

  @Patch('properties/:id/status')
  updateStatus(@Param('id') id: number, @Body() body: UpdateStatusDTO, @Req() req: any) {
    return this.adminService.updateStatus(id, body, req.user.id);
  }

  @Patch('properties/:id/expiry')
  setExpiry(@Param('id') id: number, @Body() body: ExpiryDTO, @Req() req: any) {
    return this.adminService.setExpiry(id, body.days, req.user.id);
  }

  @Patch('properties/:id')
  editProperty(@Param('id') id: number, @Body() body: UpdatePropertyDTO, @Req() req: any) {
    return this.adminService.updatePropertyByAdmin(id, body, req.user.id);
  }

  @Get('stats')
  stats() {
    return this.adminService.getStats();
  }

  @Get('audit')
  audit(@Query() query: AuditQueryDTO) {
    return this.adminService.getAudit(query.page);
  }

  @Get('reports')
  getReports() {
    return this.adminService.getReports();
  }

  @Patch('reports/:id/resolve')
  resolveReport(@Param('id') id: number, @Req() req: any) {
    return this.adminService.resolveReport(id, req.user.id);
  }

  @Post('reports/:id/hide-property')
  hideProperty(@Param('id') id: number, @Req() req: any) {
    return this.adminService.hideReportedProperty(id, req.user.id);
  }

  @Post('reports/:id/warn-owner')
  warnOwner(@Param('id') id: number, @Req() req: any) {
    return this.adminService.warnReportedOwner(id, req.user.id);
  }

  @Get('users')
  getUsers(@Query() query: AdminUsersQueryDTO) {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:id/block')
  blockUser(@Param('id') id: number, @Body() body: BlockUserDTO, @Req() req: any) {
    return this.adminService.setBlocked(id, body.blocked, req.user.id);
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