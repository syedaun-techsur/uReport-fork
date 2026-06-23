import { Injectable } from '@nestjs/common';
import session from 'express-session';

// Session type with all our custom data fields accessible
type AppSession = session.Session & Partial<session.SessionData>;

@Injectable()
export class SessionService {
  getUser(sess: AppSession): { userId: number; role: string | null } | null {
    if (sess.userId === undefined) return null;
    return { userId: sess.userId, role: sess.role ?? null };
  }

  setUser(sess: AppSession, userId: number, role: string | null): void {
    sess.userId = userId;
    sess.role = role;
  }

  clearUser(sess: AppSession): void {
    delete sess.userId;
    delete sess.role;
  }

  setState(sess: AppSession, state: string, nonce: string): void {
    sess.state = state;
    sess.nonce = nonce;
  }

  /**
   * Validates that the given state matches the session state.
   * Clears both state and nonce from session after validation.
   * Returns the nonce for id_token validation.
   * Throws if state mismatches (FRD §F04.2 INVALID_STATE).
   */
  validateAndClearState(sess: AppSession, state: string): string {
    if (!sess.state || sess.state !== state) {
      throw new Error('INVALID_STATE');
    }
    const nonce = sess.nonce ?? '';
    delete sess.state;
    delete sess.nonce;
    return nonce;
  }

  setReturnTo(sess: AppSession, url: string): void {
    // Validate returnTo is a same-origin relative path (TechArch §5.6 open redirect mitigation)
    if (url.startsWith('/') && !url.startsWith('//')) {
      sess.returnTo = url;
    }
  }

  getAndClearReturnTo(sess: AppSession): string | undefined {
    const url = sess.returnTo;
    delete sess.returnTo;
    return url;
  }

  destroy(sess: AppSession): Promise<void> {
    return new Promise((resolve, reject) => {
      sess.destroy((err) => {
        if (err) reject(err as Error);
        else resolve();
      });
    });
  }
}
