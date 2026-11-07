import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateCategoryDTO {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: "slug faqat kichik harf, raqam va tiredan iborat bo'lsin",
  })
  slug: string;
}
