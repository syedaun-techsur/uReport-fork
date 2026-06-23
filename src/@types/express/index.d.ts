import 'express-session';
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    role?: string | null;
    state?: string;
    nonce?: string;
    returnTo?: string;
  }
}
