import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

export class CreateAddressDto {
  @IsString() @MaxLength(128) address!: string;
  @IsOptional() @IsString() @MaxLength(128) city?: string;
  @IsOptional() @IsString() @MaxLength(128) state?: string;
  @IsOptional() @IsString() @MaxLength(20) zip?: string;
  @IsIn(['Home', 'Business', 'Rental'])
  label: string = 'Home';
}
