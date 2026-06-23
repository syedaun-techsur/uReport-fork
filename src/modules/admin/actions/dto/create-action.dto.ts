import { IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateActionDto {
  @IsString()
  @MaxLength(25)
  name!: string;

  @IsString()
  @MaxLength(128)
  description!: string;

  // type is always forced to 'department' on create — system actions are seed-only
  @IsString()
  @IsOptional()
  template?: string;

  @IsString()
  @MaxLength(128)
  @IsOptional()
  replyEmail?: string;
}
