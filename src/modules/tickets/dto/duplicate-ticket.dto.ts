import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class DuplicateTicketDto {
  @IsInt()
  @Type(() => Number)
  parent_id!: number;
}
