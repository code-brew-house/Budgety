import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
}
