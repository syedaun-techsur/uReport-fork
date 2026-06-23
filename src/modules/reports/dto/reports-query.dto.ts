import { IsOptional, IsString, IsInt, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query params for GET /reports (FRD §F13.2).
 */
export class ReportsQueryDto {
  /** ISO 8601 start date — filter tickets.enteredDate >= start_date */
  @IsOptional()
  @IsString()
  start_date?: string;

  /** ISO 8601 end date — filter tickets.enteredDate <= end_date */
  @IsOptional()
  @IsString()
  end_date?: string;

  /** Filter by ticket status: 'open' or 'closed' */
  @IsOptional()
  @IsIn(['open', 'closed'])
  status?: 'open' | 'closed';

  /** Filter by category_id */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  category_id?: number;

  /** Filter by department_id (via categories.department_id JOIN) */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  department_id?: number;

  /** Page number (1-based); default 1 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  /** Results per page; default 100, max 1000 (FRD §F13.2) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  page_size?: number = 100;
}

/** Single row in the /reports result set (FRD §F13.2 outputs) */
export interface ReportRowDto {
  id: number;
  status: string;
  category_name: string | null;
  department_name: string | null;
  location: string | null;
  city: string | null;
  zip: string | null;
  enteredDate: string;     // ISO 8601
  closedDate: string | null; // ISO 8601 or null
  substatus_name: string | null;
  description: string | null;
}

/** Paginated response from GET /reports */
export interface ReportsResponseDto {
  total: number;
  page: number;
  page_size: number;
  results: ReportRowDto[];
}
