import { IsOptional, IsString, MaxLength, IsEmail } from 'class-validator';

export class UpsertActionResponseDto {
  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @IsEmail()
  replyEmail?: string;
}
