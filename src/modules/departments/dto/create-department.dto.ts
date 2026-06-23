import { IsString, MaxLength, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDepartmentDto {
  @IsString()
  @MaxLength(128)
  name!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  defaultPerson_id?: number;
}
