import { IsString, MaxLength, IsIn, IsBoolean, IsOptional } from 'class-validator';

export class CreateSubstatusDto {
  @IsString()
  @MaxLength(25)
  name!: string;

  @IsString()
  @MaxLength(128)
  description!: string;

  @IsIn(['open', 'closed'])
  status: string = 'open';

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false;
}
