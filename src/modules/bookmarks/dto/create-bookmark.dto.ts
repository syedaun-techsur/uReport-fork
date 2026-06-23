import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

export class CreateBookmarkDto {
  /**
   * User-defined display name for the bookmark.
   * Optional — omitting produces a nameless bookmark (name=null in DB).
   * VARCHAR(128) per schema.
   */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  /**
   * The full request URI to bookmark — e.g. "/search?q=pothole+elm+street&status=open".
   * VARCHAR(1024) per schema.
   * Required per PRD §F12: "save the current search URI under a user-defined name".
   */
  @IsString()
  @MaxLength(1024)
  requestUri!: string;

  /**
   * Bookmark type — 'search' (default) or 'digest' (email digest subscription).
   * type='digest' is consumed by DigestCron (plan 13 NotificationsModule).
   * Per mysql.sql: VARCHAR(128) DEFAULT 'search'.
   */
  @IsOptional()
  @IsString()
  @IsIn(['search', 'digest'])
  type?: string;
}
