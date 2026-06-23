import { Injectable } from '@nestjs/common';
import { Session, SessionData } from 'express-session';

// The session object on req is Session & Partial<SessionData>
// We use this type alias for convenience
type AppSession = Session & Partial<SessionData>;

@Injectable()
export class SessionService {
  getUser(session: AppSession): { userId: number; role: string | null } | null {
    if (session.userId === undefined) return null;
    return { userId: session.userId, role: session.role ?? null };
  }

  setUser(session: AppSession, userId: number, role: string | null): void {
    session.userId = userId;
    session.role = role;
  }

  clearUser(session: AppSession): void {
    delete session.userId;
    delete session.role;
  }

  setState(session: AppSession, state: string, nonce: string): void {
    session.state = state;
    session.nonce = nonce;
  }

  /**
   * Validates that the given state matches the session state.
   * Clears both state and nonce from session after validation.
   * Returns the nonce for id_token validation.
   * Throws if state mismatches (FRD §F04.2 INVALID_STATE).
   */
  validateAndClearState(session: AppSession, state: string): string {
    if (!session.state || session.state !== state) {
      throw new Error('INVALID_STATE');
    }
    const nonce = session.nonce ?? '';
    delete session.state;
    delete session.nonce;
    return nonce;
  }

  setReturnTo(session: AppSession, url: string): void {
    // Validate returnTo is a same-origin relative path (TechArch §5.6 open redirect mitigation)
    if (url.startsWith('/') && !url.startsWith('//')) {
      session.returnTo = url;
    }
  }

  getAndClearReturnTo(session: AppSession): string | undefined {
    const url = session.returnTo;
    delete session.returnTo;
    return url;
  }

  destroy(session: AppSession): Promise<void> {
    return new Promise((resolve, reject) => {
      session.destroy((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
