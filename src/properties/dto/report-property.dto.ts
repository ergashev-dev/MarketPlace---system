import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const REPORT_REASONS = [
  'SPAM',
  'WRONG_INFO',
  'SOLD',
  'SCAM',
  'OTHER',
] as const;

export class ReportPropertyDTO {
  @IsIn(REPORT_REASONS)
  reason: (typeof REPORT_REASONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
