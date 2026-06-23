/**
 * F7 notification trigger actions — the six lifecycle events that fire emails.
 * Source: PRD §F7 Capabilities + FRD §F07.1 trigger matrix.
 * Matches the seeded actions.name values in actions table (mysql.sql lines 100–109).
 */
export type NotificationAction =
  | 'open'
  | 'assignment'
  | 'closed'
  | 'response'
  | 'comment'
  | 'duplicate';

/**
 * Outcome of a single email send attempt.
 * Logged as JSON in ticketHistory.sentNotifications.
 */
export interface NotificationSendResult {
  /** Recipient email address */
  email: string;
  /** Whether the SMTP send succeeded */
  sent: boolean;
  /** ISO 8601 timestamp of the send attempt */
  timestamp: string;
  /** Error message if sent=false */
  error?: string;
}
