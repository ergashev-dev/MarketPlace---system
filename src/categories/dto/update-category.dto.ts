import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateCategoryDTO {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: "slug faqat kichik harf, raqam va tiredan iborat bo'lsin",
  })
  slug?: string;
}
