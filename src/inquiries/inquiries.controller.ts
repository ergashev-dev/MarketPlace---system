import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { InquiriesService } from './inquiries.service.js';
import { CreateInquiryDTO } from './dto/create-inquiry.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller()
export class InquiriesController {
    constructor(private readonly inquriesServies: InquiriesService) {}
    
    @Get('/inquiries/my')
    getMyInquries(@Req() req: any) {
        return this.inquriesServies.getMyInquiries(req.user.id)
    }
    @Post('/properties/:propertyId/inquiries')
    createInquries(@Param('propertyId') propertyId: number, @Req() req: any, @Body() body: CreateInquiryDTO) {
        return this.inquriesServies.createInquiry(propertyId, req.user.id, body)
    }
}
