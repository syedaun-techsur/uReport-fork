import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';

// Subject strings mirror the domain entities. Using plain strings (not classes)
// avoids circular import issues and is compatible with how controllers pass subjects.
export type Subjects =
  | 'Category'
  | 'Ticket'
  | 'Token'
  | 'Person'
  | 'Bookmark'
  | 'Department'
  | 'Client'
  | 'Media'
  | 'Action'
  | 'Substatus'
  | 'IssueType'
  | 'ContactMethod'
  | 'Search'
  | 'Report'
  | 'Session'
  | 'all';

export type AppAbility = MongoAbility<[string, Subjects]>;

@Injectable()
export class AbilityFactory {
  createForUser(user: { id: number; role: string | null } | null): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user?.role === 'staff') {
      // Staff: full access per FRD §F02.4 / TechArch §5.3
      can('manage', 'all');
      return build();
    }

    // Anonymous base rules (FRD §F02.2, §F02.6)
    can('read', 'Category', { displayPermissionLevel: { $in: ['anonymous'] } } as any);
    can('read', 'Ticket', { 'category.displayPermissionLevel': { $in: ['anonymous'] } } as any);
    can('create', 'Ticket', { 'category.postingPermissionLevel': 'anonymous' } as any);
    can('read', 'Token');
    can('read', 'ContactMethod'); // GET /contact-methods is anonymous per TechArch §4.3
    can('read', 'Department');   // GET /departments is anonymous per TechArch §4.3

    if (user !== null) {
      // Public (authenticated citizen, role = null): extends anonymous per FRD §F02.3, §F02.6
      can('read', 'Category', { displayPermissionLevel: { $in: ['anonymous', 'public'] } } as any);
      can('read', 'Ticket', { 'category.displayPermissionLevel': { $in: ['anonymous', 'public'] } } as any);
      can('create', 'Ticket', { 'category.postingPermissionLevel': { $in: ['anonymous', 'public'] } } as any);
      can('manage', 'Bookmark', { person_id: user.id } as any);
      can('read', 'Person', { id: user.id } as any);
      can('update', 'Person', { id: user.id } as any);
      can('read', 'Session'); // own /account endpoint
    }

    return build();
  }
}
