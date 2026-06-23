import {
  IsOptional, IsString, IsInt, IsIn, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetRequestsDto {
  // status: 'open' or 'closed' (FRD §F00.4)
  @IsOptional()
  @IsIn(['open', 'closed'])
  status?: 'open' | 'closed';

  // service_code: filter by category id (FRD §F00.4)
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  service_code?: number;

  // service_request_id: comma-separated ticket IDs (FRD §F00.4)
  @IsOptional()
  @IsString()
  service_request_id?: string;

  // ISO 8601 date range (FRD §F00.4)
  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  // Geo radius search (FRD §F00.4)
  @IsOptional()
  @Type(() => Number)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  long?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  radius?: number;

  // Pagination — default page=1, page_size=100, max 500 (FRD §F00.4)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page_size?: number = 100;

  // jurisdiction_id: accepted and ignored (FRD §F00.1)
  @IsOptional()
  @IsString()
  jurisdiction_id?: string;
}
