import { IsOptional, IsString } from 'class-validator';

/**
 * Query params for GET /metrics (FRD §F13.1).
 * Both fields are optional ISO 8601 datetimes for filtering enteredDate range.
 */
export class MetricsQueryDto {
  /**
   * ISO 8601 start date; filter: tickets.enteredDate >= start_date
   * (FRD §F13.1 inputs)
   */
  @IsOptional()
  @IsString()
  start_date?: string;

  /**
   * ISO 8601 end date; filter: tickets.enteredDate <= end_date
   * (FRD §F13.1 inputs)
   */
  @IsOptional()
  @IsString()
  end_date?: string;
}

/** Shape of a single byCategory entry (FRD §F13.1 outputs) */
export interface CategoryBreakdown {
  category_id: number;
  category_name: string;
  count: number;
}

/** Shape of a single byDepartment entry (FRD §F13.1 outputs) */
export interface DepartmentBreakdown {
  department_id: number;
  department_name: string;
  count: number;
}

/** Full metrics response object (FRD §F13.1 outputs) */
export interface MetricsDto {
  openCount: number;
  closedCount: number;
  totalCount: number;
  avgResolutionDays: number | null;
  byCategory: CategoryBreakdown[];
  byDepartment: DepartmentBreakdown[];
}
