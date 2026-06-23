import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

export class CreatePhoneDto {
  @IsOptional() @IsString() @MaxLength(20) number?: string;
  @IsIn(['Main', 'Mobile', 'Work', 'Home', 'Fax', 'Pager', 'Other'])
  label: string = 'Other';
}
