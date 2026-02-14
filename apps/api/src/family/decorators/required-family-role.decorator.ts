import { SetMetadata } from '@nestjs/common';
import { FamilyRole } from '@prisma/client';

export const REQUIRED_FAMILY_ROLE_KEY = 'requiredFamilyRole';
export const RequiredFamilyRole = (role: FamilyRole) =>
  SetMetadata(REQUIRED_FAMILY_ROLE_KEY, role);
