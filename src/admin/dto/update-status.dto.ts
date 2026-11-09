import { Transform } from 'class-transformer';
import { IsIn, IsString, Length, ValidateIf } from 'class-validator';
import { PropertyStatus } from '@prisma/client';

export class UpdateStatusDTO {
  @IsIn([PropertyStatus.APPROVED, PropertyStatus.REJECTED], {
    message: "status faqat APPROVED yoki REJECTED bo'lishi mumkin",
  })
  status: PropertyStatus;

  // REJECTED bo'lganda majburiy (3-500 belgi); APPROVED bo'lsa e'tiborga olinmaydi
  @ValidateIf((o: UpdateStatusDTO) => o.status === PropertyStatus.REJECTED)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: "Rad etish sababi (reason) majburiy" })
  @Length(3, 500, {
    message: "Rad etish sababi 3 dan 500 belgigacha bo'lishi kerak",
  })
  reason?: string;
}
