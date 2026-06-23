import {
  IsString, IsInt, IsOptional, IsEmail,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PostRequestDto {
  // api_key: accepted as query param, body param (FRD §F00.3)
  // NOTE: the controller reads from req.query || req.body; dto validates it once extracted
  @IsString()
  @MaxLength(50)
  api_key!: string;

  // service_code maps to categories.id (FRD §F00.3)
  @IsInt()
  @Type(() => Number)
  service_code!: number;

  // Location: either (lat+long) or address_string required — validated in service (FRD §F00.3)
  @IsOptional()
  @Type(() => Number)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  long?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address_string?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  address_id?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  last_name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must match RFC 5322 format' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  // device_id: accepted and ignored for compatibility (FRD §F00.3)
  @IsOptional()
  @IsString()
  device_id?: string;

  // media_url: stored in ticketHistory.notes (FRD §F00.3)
  @IsOptional()
  @IsString()
  media_url?: string;

  // jurisdiction_id: accepted and ignored (FRD §F00.1)
  @IsOptional()
  @IsString()
  jurisdiction_id?: string;

  // attribute[{code}] custom field values: encoded in tickets.customFields JSON (FRD §F00.3)
  // These arrive as dynamic keys — handled via raw body parsing in the service, not a DTO field
}
