import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { FamilyRole } from '@prisma/client';
import { REQUIRED_FAMILY_ROLE_KEY } from '../decorators/required-family-role.decorator';

@Injectable()
export class FamilyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request['user'] as { id: string } | undefined;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const familyId =
      (request.params as Record<string, string>)['familyId'] ||
      (request.params as Record<string, string>)['fid'];

    if (!familyId) {
      throw new ForbiddenException('Family ID required');
    }

    const member = await this.prisma.familyMember.findUnique({
      where: {
        userId_familyId: { userId: user.id, familyId },
      },
    });

    if (!member) {
      throw new ForbiddenException('Not a member of this family');
    }

    const requiredRole = this.reflector.getAllAndOverride<FamilyRole>(
      REQUIRED_FAMILY_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRole === FamilyRole.ADMIN && member.role !== FamilyRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    request['familyMember'] = member;

    return true;
  }
}
