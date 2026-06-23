import { IsEmail, IsIn, IsBoolean, IsOptional } from 'class-validator';

export class CreateEmailDto {
  @IsEmail({}, { message: 'email must match RFC 5322 format' })
  email!: string;

  @IsIn(['Home', 'Work', 'Other'])
  label: string = 'Other';

  @IsBoolean()
  @IsOptional()
  usedForNotifications?: boolean = false;
}
