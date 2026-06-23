import { IsString } from 'class-validator';

export class CommentTicketDto {
  @IsString()
  notes!: string;
}
