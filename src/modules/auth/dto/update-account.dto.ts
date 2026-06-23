import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional() @IsString() @MaxLength(128) firstname?: string;
  @IsOptional() @IsString() @MaxLength(128) middlename?: string;
  @IsOptional() @IsString() @MaxLength(128) lastname?: string;
  @IsOptional() @IsString() @MaxLength(128) organization?: string;
  @IsOptional() @IsString() @MaxLength(128) address?: string;
  @IsOptional() @IsString() @MaxLength(128) city?: string;
  @IsOptional() @IsString() @MaxLength(128) state?: string;
  @IsOptional() @IsString() @MaxLength(20) zip?: string;
}
