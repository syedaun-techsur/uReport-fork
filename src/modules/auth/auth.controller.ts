import {
  Controller, Get, Put, Query, Req, Res, Body,
  UnauthorizedException, NotFoundException, HttpCode,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Session, SessionData } from 'express-session';
import { AuthService } from './auth.service';
import { UpdateAccountDto } from './dto/update-account.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from './session.service';

// The session object on req is Session & Partial<SessionData>
type AppSession = Session & Partial<SessionData>;

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  /** GET /auth/login — FRD §F04.1 */
  @Get('auth/login')
  async login(
    @Query('return_to') returnTo: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const authUrl = await this.authService.initiateLogin(req.session as AppSession, returnTo);
    res.redirect(authUrl);
  }

  /** GET /auth/callback — FRD §F04.2 */
  @Get('auth/callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const redirectTo = await this.authService.handleCallback(req.session as AppSession, { code, state });
    res.redirect(redirectTo);
  }

  /** GET /auth/logout — FRD §F04.4 */
  @Get('auth/logout')
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const redirectTo = await this.authService.logout(req.session as AppSession);
    res.clearCookie('connect.sid');
    res.redirect(redirectTo);
  }

  /** GET /account — FRD §F04.5 */
  @Get('account')
  async getAccount(@Req() req: Request) {
    const userSession = this.sessionService.getUser(req.session as AppSession);
    if (!userSession) throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Authentication required' });

    const person = await this.prisma.people.findUnique({
      where: { id: userSession.userId },
      include: { peopleEmails: true, peoplePhones: true, peopleAddresses: true },
    });
    if (!person) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Account not found' });
    return person;
  }

  /** PUT /account — FRD §F04.5 */
  @Put('account')
  @HttpCode(200)
  async updateAccount(@Req() req: Request, @Body() dto: UpdateAccountDto) {
    const userSession = this.sessionService.getUser(req.session as AppSession);
    if (!userSession) throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Authentication required' });

    const updated = await this.prisma.people.update({
      where: { id: userSession.userId },
      // Never update role or username (FRD §F04.5)
      data: {
        firstname: dto.firstname,
        middlename: dto.middlename,
        lastname: dto.lastname,
        organization: dto.organization,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zip: dto.zip,
      },
    });
    return updated;
  }
}
