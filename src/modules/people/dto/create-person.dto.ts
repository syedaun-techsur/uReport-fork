import { IsString, IsOptional, MaxLength, IsIn, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePersonDto {
  @IsOptional() @IsString() @MaxLength(128) firstname?: string;
  @IsOptional() @IsString() @MaxLength(128) middlename?: string;
  @IsOptional() @IsString() @MaxLength(128) lastname?: string;
  @IsOptional() @IsString() @MaxLength(128) organization?: string;
  @IsOptional() @IsString() @MaxLength(128) address?: string;
  @IsOptional() @IsString() @MaxLength(128) city?: string;
  @IsOptional() @IsString() @MaxLength(128) state?: string;
  @IsOptional() @IsString() @MaxLength(20) zip?: string;
  @IsOptional() @IsInt() @Type(() => Number) department_id?: number;
  @IsOptional() @IsString() @MaxLength(40) username?: string;
  // role: null = citizen (public), 'staff' = staff — FRD F11.1 + F02.1
  @IsOptional() @IsIn([null, 'staff']) role?: string | null;
}
