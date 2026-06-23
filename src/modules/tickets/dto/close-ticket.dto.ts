import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CloseTicketDto {
  @IsInt()
  @Type(() => Number)
  substatus_id!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
