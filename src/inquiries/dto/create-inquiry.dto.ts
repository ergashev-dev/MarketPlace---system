import { IsNotEmpty, IsPhoneNumber, IsString, Length } from 'class-validator';

export class CreateInquiryDTO {
  @IsNotEmpty()
  @IsString()
  @Length(10, 1000)
  message: string;

  @IsNotEmpty()
  @IsPhoneNumber('UZ')
  phone: string;
}