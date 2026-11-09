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

export class UpdatePropertyDTO {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @Length(5, 150)
  title?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MinLength(20)
  description?: string;

  @IsOptional()
  @IsPositive()
  price?: number;

  @IsOptional()
  @IsIn(['USD', 'UZS'])
  currency?: string;

  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  city?: string;

  @IsOptional()
  @IsPositive()
  area?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  rooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

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
