import { IsIn } from 'class-validator';
import { PropertyStatus } from '@prisma/client';

export class UpdateStatusDTO {
  @IsIn([PropertyStatus.APPROVED, PropertyStatus.REJECTED], {
    message: "status faqat APPROVED yoki REJECTED bo'lishi mumkin",
  })
  status: PropertyStatus;
}