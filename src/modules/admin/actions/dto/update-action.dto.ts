import { IsString, MaxLength, IsOptional } from 'class-validator';

export class UpdateActionDto {
  // name cannot be changed on system actions (enforced in service)
  @IsString()
  @MaxLength(25)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(128)
  @IsOptional()
  description?: string;

  // template and replyEmail CAN be updated on system actions (per FRD F15.2)
  @IsString()
  @IsOptional()
  template?: string;

  @IsString()
  @MaxLength(128)
  @IsOptional()
  replyEmail?: string;
}
