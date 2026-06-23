import { IsString, IsNotEmpty } from 'class-validator';

export class CommentTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'notes must be non-empty (FRD §F01.6)' })
  notes!: string;
}
