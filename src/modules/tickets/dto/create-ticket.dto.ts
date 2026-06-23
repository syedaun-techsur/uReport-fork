import {
  IsInt, IsOptional, IsString, MaxLength, IsNumber, Min, Max, IsJSON,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTicketDto {
  @IsInt()
  @Type(() => Number)
  category_id!: number;

  @IsOptional() @IsInt() @Type(() => Number) issueType_id?: number;

  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsString() @MaxLength(128) location?: string;

  @IsOptional() @IsString() @MaxLength(128) city?: string;

  @IsOptional() @IsString() @MaxLength(128) state?: string;

  @IsOptional() @IsString() @MaxLength(40) zip?: string;

  @IsOptional() @IsNumber() @Min(-90) @Max(90) @Type(() => Number) latitude?: number;

  @IsOptional() @IsNumber() @Min(-180) @Max(180) @Type(() => Number) longitude?: number;

  @IsOptional() @IsInt() @Type(() => Number) addressId?: number;

  @IsOptional() @IsInt() @Type(() => Number) contactMethod_id?: number;

  @IsOptional() @IsInt() @Type(() => Number) responseMethod_id?: number;

  @IsOptional() @IsInt() @Type(() => Number) reportedByPerson_id?: number;

  @IsOptional() @IsString() @IsJSON() customFields?: string;

  @IsOptional() @IsString() @MaxLength(255) additionalFields?: string;
}
