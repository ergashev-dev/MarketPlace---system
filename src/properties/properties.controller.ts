import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PropertiesService } from './properties.service.js';
import { CreatePropertyDTO } from './dto/create-property.dto.js';
import { UpdatePropertyDTO } from './dto/update-property.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';
import { QueryPropertyDTO } from './dto/query-property.dto.js';
import type { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createProperty(@Body() body: CreatePropertyDTO, @Req() req: any) {
    return this.propertiesService.createProperty(body, req.user.id);
  }
  @UseGuards(JwtAuthGuard)
  @Post(':id/images')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/properties',
        filename: (req, file, cb) => {
          const uniqueName = Date.now() + extname(file.originalname);
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Faqat jpg, png yoki webp rasm yuklash mumkin'),
            false,
          );
        }
      },
    }),
  )
  addImage(
    @Param('id') id: number,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Rasm yuborilmadi');
    }
    return this.propertiesService.addImage(id, req.user.id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/images/:imageId')
  deleteImage(
    @Param('id') id: number,
    @Param('imageId') imageId: number,
    @Req() req: any,
  ) {
    return this.propertiesService.deleteImage(id, imageId, req.user.id);
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