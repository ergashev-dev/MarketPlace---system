import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ListingType } from '@prisma/client';

export const PROPERTY_CURRENCIES = { USD: 'USD', UZS: 'UZS' } as const;
export type PropertyCurrency = keyof typeof PROPERTY_CURRENCIES;

export class QueryPropertyDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ListingType)
  type?: ListingType;

  @ApiPropertyOptional({
    enum: PROPERTY_CURRENCIES,
    description:
      "Narx filtri qaysi valyutada ishlashini belgilaydi. Berilmasa minPrice/maxPrice valyutani ajratmasdan (USD va UZS aralash) qo'llanadi. Aniq natija uchun minPrice/maxPrice bilan birga yuboring.",
  })
  @IsOptional()
  @IsEnum(PROPERTY_CURRENCIES)
  currency?: PropertyCurrency;

  @ApiPropertyOptional({
    description: "Minimal narx. `currency` berilmasa valyuta e'tiborga olinmaydi.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: "Maksimal narx. `currency` berilmasa valyuta e'tiborga olinmaydi.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rooms?: number;

  @ApiPropertyOptional({
    description: "Matnli qidiruv: sarlavha, tavsif, manzil va shahar bo'yicha",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(['newest', 'price_asc', 'price_desc', 'area_asc', 'area_desc', 'popular'])
  sort?: string;

  @ApiPropertyOptional({ description: 'Xarita hududi (bounding box)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minLng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxLng?: number;
}