import { IsString, IsOptional, MinLength, IsIn, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class PersonSearchDto {
  @IsString() @MinLength(2) q!: string;
  @IsOptional() @IsIn([null, 'staff']) role?: string | null;
  @IsOptional() @IsInt() @Type(() => Number) department_id?: number;
}
