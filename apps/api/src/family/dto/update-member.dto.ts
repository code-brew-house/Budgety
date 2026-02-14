import { IsEnum, IsNotEmpty } from 'class-validator';
import { FamilyRole } from '@prisma/client';

export class UpdateMemberDto {
  @IsNotEmpty()
  @IsEnum(FamilyRole)
  role!: FamilyRole;
}
