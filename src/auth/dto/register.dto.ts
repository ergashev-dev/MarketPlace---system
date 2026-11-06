import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class RegisterDTO {
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  fullName: string;

  @IsNotEmpty()
  @IsEmail()
  @IsString()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  @IsString()
  password: string;

  @IsPhoneNumber('UZ')
  @IsString()
  phone?: string;
}
