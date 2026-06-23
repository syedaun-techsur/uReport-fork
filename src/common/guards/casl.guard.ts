import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbilityFactory } from '../../modules/auth/ability.factory';
import { CHECK_ABILITIES, RequiredAbility } from '../decorators/check-abilities.decorator';
import type { Request } from 'express';

@Injectable()
export class CaslGuard implements CanActivate {
  constructor(
    private readonly abilityFactory: AbilityFactory,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Read required abilities from handler or class metadata (per TechArch §5.7)
    const required = this.reflector.getAllAndOverride<RequiredAbility[] | undefined>(
      CHECK_ABILITIES,
      [context.getHandler(), context.getClass()],
    );

    // No @CheckAbilities() decorator → pass through (guard is a no-op)
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { user: { id: number; role: string | null } | null }>();
    const user = req.user ?? null;
    const ability = this.abilityFactory.createForUser(user);

    for (const rule of required) {
      if (!ability.can(rule.action, rule.subject as any)) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }
}
