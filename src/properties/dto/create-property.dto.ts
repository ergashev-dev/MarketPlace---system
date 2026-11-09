import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsNumber,
  IsString,
  Max,
  Length,
  Min,
  MinLength,
} from 'class-validator';
import { ListingType } from '@prisma/client';

export class CreatePropertyDTO {
  @IsNotEmpty()
  @IsString()
  @Length(5, 150)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(20)
  description: string;

  @IsPositive()
  price: number;

  @IsOptional()
  @IsIn(['USD', 'UZS'])
  currency?: string;

  @IsEnum(ListingType)
  listingType: ListingType;

  @IsInt()
  categoryId: number;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  city: string;

  @IsPositive()
  area: number;

  @IsInt()
  @Min(1)
  rooms: number;

  @IsInt()
  @Min(0)
  bathrooms: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}
