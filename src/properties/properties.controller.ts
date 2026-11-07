import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PropertiesService } from './properties.service.js';
import { CreatePropertyDTO } from './dto/create-property.dto.js';
import { UpdatePropertyDTO } from './dto/update-property.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';
import { QueryPropertyDTO } from './dto/query-property.dto.js';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createProperty(@Body() body: CreatePropertyDTO, @Req() req: any) {
    return this.propertiesService.createProperty(body, req.user.id);
  }
  @Get()
  getProperties(@Query() query: QueryPropertyDTO) {
    return this.propertiesService.getProperties(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyProperties(@Req() req: any) {
    return this.propertiesService.getMyProperties(req.user.id)
  }
  

  @Get(':id')
  getPropertyById(@Param('id') id: number) {
    return this.propertiesService.getPropertyById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updateProperty(
    @Param('id') id: number,
    @Req() req: any,
    @Body() body: UpdatePropertyDTO,
  ) {
    return this.propertiesService.updateProperty(id, req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteProperty(@Param('id') id: number, @Req() req: any) {
    return this.propertiesService.deleteProperty(id, req.user.id);
  }
}