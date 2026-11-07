import { IsNotEmpty, IsOptional, IsPhoneNumber, IsString, Length } from "class-validator";

export class updateUserDTO {
    @IsNotEmpty()
    @IsString()
    @Length(2, 100)
    @IsOptional()
    fullName?: string

    @IsPhoneNumber('UZ')
    @IsString()
    @IsOptional()
    phone?: string
}