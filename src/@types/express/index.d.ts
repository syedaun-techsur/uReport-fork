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

// Augment Express Request with authenticated user (null = anonymous)
declare global {
  namespace Express {
    interface Request {
      // null = anonymous (not authenticated); Person record = authenticated
      user: {
        id: number;
        firstname: string | null;
        middlename: string | null;
        lastname: string | null;
        organization: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        zip: string | null;
        department_id: number | null;
        username: string | null;
        role: string | null;
      } | null;
    }
  }
}
