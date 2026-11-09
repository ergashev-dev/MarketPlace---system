import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDTO {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class DeleteAccountDTO {
  @IsString()
  @IsNotEmpty()
  password: string;
}
