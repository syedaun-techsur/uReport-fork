import { Injectable, BadRequestException, BadGatewayException } from '@nestjs/common';
import { Issuer, generators, Client } from 'openid-client';
import { Session, SessionData } from 'express-session';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from './session.service';
import { GelfLoggerService } from '../../common/logger/gelf-logger.service';

// The session object on req is Session & Partial<SessionData>
type AppSession = Session & Partial<SessionData>;

@Injectable()
export class AuthService {
  private client: Client | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly logger: GelfLoggerService,
  ) {}

  private async getClient(): Promise<Client> {
    if (this.client) return this.client;
    try {
      const issuer = await Issuer.discover(process.env.OIDC_ISSUER!);
      this.client = new issuer.Client({
        client_id: process.env.OIDC_CLIENT_ID!,
        client_secret: process.env.OIDC_CLIENT_SECRET!,
        redirect_uris: [process.env.OIDC_REDIRECT_URI!],
        response_types: ['code'],
      });
      return this.client;
    } catch (err) {
      this.logger.error('OIDC discovery failed', (err as Error).stack, 'AuthService');
      throw new BadGatewayException('IDP_ERROR');
    }
  }

  /** FRD §F04.1 — Build authorization URL, store state+nonce in session */
  async initiateLogin(session: AppSession, returnTo?: string): Promise<string> {
    if (returnTo) this.sessionService.setReturnTo(session, returnTo);

    const state = generators.state();
    const nonce = generators.nonce();
    this.sessionService.setState(session, state, nonce);

    const client = await this.getClient();
    return client.authorizationUrl({
      scope: 'openid email profile',
      redirect_uri: process.env.OIDC_REDIRECT_URI!,
      state,
      nonce,
    });
  }

  /** FRD §F04.2 — Exchange code, provision user, store in session */
  async handleCallback(
    session: AppSession,
    params: { code?: string; state?: string },
  ): Promise<string> {
    if (!params.code) {
      throw new BadRequestException({ error: 'MISSING_PARAMETER', message: 'Authorization code required' });
    }

    // Validate state and get stored nonce (throws INVALID_STATE on mismatch)
    let nonce: string;
    try {
      nonce = this.sessionService.validateAndClearState(session, params.state ?? '');
    } catch {
      throw new BadRequestException({ error: 'INVALID_STATE', message: 'Invalid state parameter' });
    }

    const client = await this.getClient();
    let tokenSet;
    try {
      tokenSet = await client.callback(
        process.env.OIDC_REDIRECT_URI!,
        { code: params.code },
        { state: params.state, nonce },
      );
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('nonce')) {
        throw new BadRequestException({ error: 'INVALID_NONCE', message: 'Invalid nonce in id_token' });
      }
      this.logger.error('OIDC token exchange failed', (err as Error).stack, 'AuthService');
      throw new BadGatewayException({ error: 'IDP_ERROR', message: 'Identity provider error' });
    }

    const claims = tokenSet.claims();
    const sub = claims.sub;
    const email = claims.email as string | undefined;
    const givenName = (claims.given_name as string | undefined) ?? null;
    const familyName = (claims.family_name as string | undefined) ?? null;

    // Upsert people record (FRD §F04.2 step 6)
    let person = await this.prisma.people.findUnique({ where: { username: sub } });
    if (person) {
      // Update name if changed
      if (person.firstname !== givenName || person.lastname !== familyName) {
        person = await this.prisma.people.update({
          where: { id: person.id },
          data: { firstname: givenName, lastname: familyName },
        });
      }
    } else {
      person = await this.prisma.people.create({
        data: { username: sub, firstname: givenName, lastname: familyName },
      });
    }

    // Upsert peopleEmails (FRD §F04.2 step 7) — only if email claim present
    if (email) {
      const existing = await this.prisma.peopleEmails.findFirst({
        where: { person_id: person.id, email },
      });
      if (!existing) {
        await this.prisma.peopleEmails.create({
          data: { person_id: person.id, email, label: 'Other', usedForNotifications: false },
        });
      }
    }

    // Store userId + role in session (FRD §F04.2 step 8)
    this.sessionService.setUser(session, person.id, person.role ?? null);

    const returnTo = this.sessionService.getAndClearReturnTo(session) ?? '/';
    return returnTo;
  }

  /** FRD §F04.4 — Logout: destroy session, return redirect URL */
  async logout(session: AppSession): Promise<string> {
    await this.sessionService.destroy(session);
    const endSession = process.env.OIDC_END_SESSION_ENDPOINT;
    if (endSession) {
      return endSession;
    }
    return '/';
  }
}
