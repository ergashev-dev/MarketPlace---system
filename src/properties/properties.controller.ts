import { ClosePropertyDTO } from './dto/close-property.dto.js';
import { ReportPropertyDTO } from './dto/report-property.dto.js';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
import { randomUUID } from 'crypto';
import {
  ALLOWED_IMAGE_MIMES,
  assertImageMagicBytes,
  isAllowedImageMime,
} from '../common/image-validation.js';
import { unlink } from 'fs/promises';

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
          // kengaytma foydalanuvchi bergan nomdan emas, tekshirilgan MIME'dan olinadi
          const ext = isAllowedImageMime(file.mimetype)
            ? ALLOWED_IMAGE_MIMES[file.mimetype]
            : '';
          cb(null, `${Date.now()}-${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (isAllowedImageMime(file.mimetype)) {
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
  async addImage(
    @Param('id') id: number,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Rasm yuborilmadi');
    }
    try {
      // MIME header'ga ishonmaymiz: fayl mazmuni (magic bytes) tekshiriladi
      await assertImageMagicBytes(file.path, file.mimetype);
      return await this.propertiesService.addImage(id, req.user.id, file);
    } catch (error) {
      // xato bo'lsa diskda yetim fayl qolmasin
      await unlink(file.path).catch(() => undefined);
      throw error;
    }
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
  

  @Get(':id/similar')
  getSimilar(@Param('id') id: number) {
    return this.propertiesService.getSimilar(id);
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
  @Get(':id/stats')
  stats(@Param('id') id: number, @Req() req: any) {
    return this.propertiesService.getOwnerStats(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/closed')
  setClosed(
    @Param('id') id: number,
    @Req() req: any,
    @Body() body: ClosePropertyDTO,
  ) {
    return this.propertiesService.setClosed(id, req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/renew')
  renew(@Param('id') id: number, @Req() req: any) {
    return this.propertiesService.renew(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/report')
  report(
    @Param('id') id: number,
    @Req() req: any,
    @Body() body: ReportPropertyDTO,
  ) {
    return this.propertiesService.report(id, req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteProperty(@Param('id') id: number, @Req() req: any) {
    return this.propertiesService.deleteProperty(id, req.user.id);
  }
}

@Controller()
export class SitemapController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async sitemap() {
    const site = process.env.SITE_URL ?? 'https://joylab.uz';
    const items = await this.propertiesService.getSitemapEntries();
    const urls = [
      `<url><loc>${site}/</loc></url>`,
      `<url><loc>${site}/properties</loc></url>`,
      ...items.map(
        (p) =>
          `<url><loc>${site}/properties/${p.id}</loc><lastmod>${p.createdAt.toISOString()}</lastmod></url>`,
      ),
    ];
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  }
}
