import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InquiriesService } from './inquiries.service.js';
import { CreateInquiryDTO } from './dto/create-inquiry.dto.js';
import { QueryReceivedInquiriesDTO } from './dto/query-received-inquiries.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';
import { INQUIRY_THROTTLE } from '../common/throttle.config.js';

@UseGuards(JwtAuthGuard)
@Controller()
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Get('inquiries/my')
  getMyInquiries(@Req() req: any) {
    return this.inquiriesService.getMyInquiries(req.user.id);
  }

  @Get('inquiries/received')
  getReceivedInquiries(
    @Req() req: any,
    @Query() query: QueryReceivedInquiriesDTO,
  ) {
    return this.inquiriesService.getReceivedInquiries(req.user.id, query);
  }

  @Patch('inquiries/:id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.inquiriesService.markAsRead(id, req.user.id);
  }

  @Throttle(INQUIRY_THROTTLE)
  @Post('properties/:propertyId/inquiries')
  createInquiry(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Req() req: any,
    @Body() body: CreateInquiryDTO,
  ) {
    return this.inquiriesService.createInquiry(propertyId, req.user.id, body);
  }
}
