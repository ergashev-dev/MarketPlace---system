import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PropertyStatus } from '@prisma/client';

export class AdminUsersQueryDTO {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(['yes', 'no'])
  verified?: 'yes' | 'no';

  @IsOptional()
  @IsIn(['yes', 'no'])
  blocked?: 'yes' | 'no';
}

export class BulkStatusDTO {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  ids: number[];

  @IsIn([PropertyStatus.APPROVED, PropertyStatus.REJECTED])
  status: PropertyStatus;

  @ValidateIf((o: BulkStatusDTO) => o.status === PropertyStatus.REJECTED)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 500)
  reason?: string;
}

export class BlockUserDTO {
  @IsBoolean()
  blocked: boolean;
}

export class ExpiryDTO {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days: number;
}

export class AuditQueryDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
