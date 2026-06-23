import { IsString, MaxLength } from 'class-validator';

export class CreateContactMethodDto {
  @IsString()
  @MaxLength(128)
  name!: string;
}
