import {
  IsString, MaxLength, IsInt, IsOptional, IsBoolean, IsIn, IsEmail,
  IsJSON,
} from 'class-validator';
import { Type } from 'class-transformer';

const PERMISSION_LEVELS = ['staff', 'public', 'anonymous'] as const;

export class CreateCategoryDto {
  @IsString()
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @IsInt()
  @Type(() => Number)
  department_id!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  defaultPerson_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryGroup_id?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsIn(PERMISSION_LEVELS)
  displayPermissionLevel: 'staff' | 'public' | 'anonymous' = 'staff';

  @IsIn(PERMISSION_LEVELS)
  postingPermissionLevel: 'staff' | 'public' | 'anonymous' = 'staff';

  @IsOptional()
  @IsString()
  @IsJSON()
  customFields?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  slaDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @IsEmail()
  notificationReplyEmail?: string;

  @IsOptional()
  @IsBoolean()
  autoCloseIsActive?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  autoCloseSubstatus_id?: number;
}
