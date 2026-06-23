import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignTicketDto {
  @IsInt()
  @Type(() => Number)
  assignedPerson_id!: number;
}
