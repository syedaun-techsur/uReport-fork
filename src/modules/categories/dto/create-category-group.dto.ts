import { IsString, MaxLength, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryGroupDto {
  @IsString()
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  ordering?: number;
}
