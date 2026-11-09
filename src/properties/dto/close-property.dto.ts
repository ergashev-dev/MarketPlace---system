import { IsBoolean } from 'class-validator';

export class ClosePropertyDTO {
  @IsBoolean()
  closed: boolean;
}
