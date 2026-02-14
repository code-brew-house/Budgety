import * as crypto from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FamilyRole } from '@prisma/client';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';

const familySelect = {
  id: true,
  name: true,
  currency: true,
  monthlyBudget: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FamilySelect;

const memberSelect = {
  id: true,
  role: true,
  joinedAt: true,
  userId: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      displayName: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.FamilyMemberSelect;

@Injectable()
export class FamilyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFamilyDto) {
    return this.prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: {
          name: dto.name,
          currency: dto.currency,
          monthlyBudget: dto.monthlyBudget,
        },
        select: familySelect,
      });

      await tx.familyMember.create({
        data: {
          userId,
          familyId: family.id,
          role: 'ADMIN',
        },
      });

      return family;
    });
  }

  async findAllByUser(userId: string) {
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId },
      include: {
        family: { select: familySelect },
      },
    });

    return memberships.map((m) => m.family);
  }

  async findById(familyId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: {
        ...familySelect,
        members: { select: memberSelect },
      },
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    return family;
  }

  async update(familyId: string, dto: UpdateFamilyDto) {
    return this.prisma.family.update({
      where: { id: familyId },
      data: dto,
      select: familySelect,
    });
  }

  async remove(familyId: string) {
    return this.prisma.family.delete({
      where: { id: familyId },
    });
  }

  async createInvite(familyId: string, userId: string) {
    const code = crypto
      .randomBytes(4)
      .toString('hex')
      .slice(0, 6)
      .toUpperCase();

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const invite = await this.prisma.invite.create({
      data: {
        code,
        familyId,
        createdBy: userId,
        expiresAt,
      },
    });

    return { code: invite.code, expiresAt: invite.expiresAt };
  }

  async updateMemberRole(
    familyId: string,
    memberId: string,
    role: FamilyRole,
  ) {
    const member = await this.prisma.familyMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.familyId !== familyId) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === 'ADMIN' && role === 'MEMBER') {
      const adminCount = await this.prisma.familyMember.count({
        where: { familyId, role: 'ADMIN' },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Cannot demote the last admin');
      }
    }

    return this.prisma.familyMember.update({
      where: { id: memberId },
      data: { role },
      select: memberSelect,
    });
  }

  async removeMember(familyId: string, memberId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.familyId !== familyId) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === 'ADMIN') {
      const adminCount = await this.prisma.familyMember.count({
        where: { familyId, role: 'ADMIN' },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Cannot remove the last admin');
      }
    }

    await this.prisma.familyMember.delete({
      where: { id: memberId },
    });
  }

  async joinFamily(userId: string, code: string) {
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.invite.findFirst({
        where: {
          code,
          usedBy: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!invite) {
        throw new BadRequestException('Invalid or expired invite code');
      }

      const existingMember = await tx.familyMember.findFirst({
        where: {
          userId,
          familyId: invite.familyId,
        },
      });

      if (existingMember) {
        throw new BadRequestException('Already a member of this family');
      }

      await tx.familyMember.create({
        data: {
          userId,
          familyId: invite.familyId,
          role: 'MEMBER',
        },
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: {
          usedBy: userId,
          usedAt: new Date(),
        },
      });

      return tx.family.findUnique({
        where: { id: invite.familyId },
        select: familySelect,
      });
    });
  }
}
