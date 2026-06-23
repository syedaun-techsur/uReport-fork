import { IsString, MaxLength } from 'class-validator';

export class CreateIssueTypeDto {
  @IsString()
  @MaxLength(128)
  name!: string;
}
