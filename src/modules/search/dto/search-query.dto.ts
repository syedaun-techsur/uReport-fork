import { IsOptional, IsIn, IsInt, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  /** Full-text query; default *:* (all) */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['open', 'closed'])
  status?: 'open' | 'closed';

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  category_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  department_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  assignedPerson_id?: number;

  /** ISO 8601 date range start for enteredDate */
  @IsOptional()
  @IsString()
  start_date?: string;

  /** ISO 8601 date range end for enteredDate */
  @IsOptional()
  @IsString()
  end_date?: string;

  /** Sort: 'relevance' (default) or 'date' */
  @IsOptional()
  @IsIn(['relevance', 'date'])
  sort?: 'relevance' | 'date';

  /** 1-based page number; default 1 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  /** Results per page; default 25, max 500 (FRD §F05.2) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  rows?: number = 25;
}
