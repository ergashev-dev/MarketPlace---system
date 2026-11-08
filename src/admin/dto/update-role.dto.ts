import { IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateRoleDTO {
  @IsEnum(Role, { message: "role faqat USER yoki ADMIN bo'lishi mumkin" })
  role: Role;
}
