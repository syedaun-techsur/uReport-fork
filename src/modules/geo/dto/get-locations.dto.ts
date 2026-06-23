import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class GetLocationsDto {
  /**
   * Zoom level 0–6 (FRD §F09.5). Default 3.
   * 0 = coarsest (fewest, largest clusters), 6 = finest.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  @Type(() => Number)
  zoom_level?: number = 3;

  /** Filter by ticket status: 'open' or 'closed' (FRD §F09.5) */
  @IsOptional()
  @IsIn(['open', 'closed'])
  status?: 'open' | 'closed';

  /** Filter by category_id (FRD §F09.5) */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  category_id?: number;
}
