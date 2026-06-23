import { SetMetadata } from '@nestjs/common';

export const CHECK_ABILITIES = 'check_abilities';

export interface RequiredAbility {
  action: string;
  subject: string;
}

/**
 * Decorator applied to controller methods (or classes) to declare the CASL ability
 * required to access the route.
 *
 * Usage:
 *   @UseGuards(CaslGuard)
 *   @CheckAbilities({ action: 'read', subject: 'Ticket' })
 *   async getTicket(...) { }
 *
 * Multiple requirements can be passed; ALL must be satisfied (AND semantics).
 */
export const CheckAbilities = (...requirements: RequiredAbility[]) =>
  SetMetadata(CHECK_ABILITIES, requirements);
