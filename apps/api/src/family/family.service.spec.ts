/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FamilyService } from './family.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';

const familySelect = {
  id: true,
  name: true,
  currency: true,
  monthlyBudget: true,
  largeExpenseThreshold: true,
  createdAt: true,
  updatedAt: true,
};

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
};

describe('FamilyService', () => {
  let service: FamilyService;
  let prisma: PrismaService;

  const mockPrismaService = {
    family: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    familyMember: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    invite: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FamilyService>(FamilyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create family and member in transaction', async () => {
      const dto: CreateFamilyDto = {
        name: 'Test Family',
        currency: 'USD',
        monthlyBudget: 5000,
      };
      const userId = 'user-123';

      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
        currency: 'USD',
        monthlyBudget: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        const tx = {
          family: { create: jest.fn().mockResolvedValue(mockFamily) },
          familyMember: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const result = await service.create(userId, dto);

      expect(result).toEqual(mockFamily);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('findAllByUser', () => {
    it("should return user's families", async () => {
      const userId = 'user-123';
      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
        currency: 'INR',
        monthlyBudget: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.familyMember.findMany.mockResolvedValue([
        { family: mockFamily },
      ]);

      const result = await service.findAllByUser(userId);

      expect(result).toEqual([mockFamily]);
      expect(prisma.familyMember.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          family: { select: familySelect },
        },
      });
    });
  });

  describe('findById', () => {
    it('should return family with members', async () => {
      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
        currency: 'INR',
        monthlyBudget: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            id: 'member-1',
            role: 'ADMIN',
            joinedAt: new Date(),
            userId: 'user-123',
            user: {
              id: 'user-123',
              name: 'John',
              email: 'john@example.com',
              displayName: null,
              avatarUrl: null,
            },
          },
        ],
      };

      mockPrismaService.family.findUnique.mockResolvedValue(mockFamily);

      const result = await service.findById('family-123');

      expect(result).toEqual(mockFamily);
      expect(prisma.family.findUnique).toHaveBeenCalledWith({
        where: { id: 'family-123' },
        select: {
          ...familySelect,
          members: { select: memberSelect },
        },
      });
    });

    it('should throw NotFoundException when family not found', async () => {
      mockPrismaService.family.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('nonexistent')).rejects.toThrow(
        'Family not found',
      );
    });
  });

  describe('update', () => {
    it('should update and return family', async () => {
      const dto: UpdateFamilyDto = {
        name: 'Updated Family',
        monthlyBudget: 8000,
      };

      const mockUpdatedFamily = {
        id: 'family-123',
        name: 'Updated Family',
        currency: 'INR',
        monthlyBudget: 8000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.family.update.mockResolvedValue(mockUpdatedFamily);

      const result = await service.update('family-123', dto);

      expect(result).toEqual(mockUpdatedFamily);
      expect(prisma.family.update).toHaveBeenCalledWith({
        where: { id: 'family-123' },
        data: dto,
        select: familySelect,
      });
    });
  });

  describe('remove', () => {
    it('should delete family', async () => {
      const mockDeletedFamily = {
        id: 'family-123',
        name: 'Test Family',
        currency: 'INR',
        monthlyBudget: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.family.delete.mockResolvedValue(mockDeletedFamily);

      const result = await service.remove('family-123');

      expect(result).toEqual(mockDeletedFamily);
      expect(prisma.family.delete).toHaveBeenCalledWith({
        where: { id: 'family-123' },
      });
    });
  });

  describe('createInvite', () => {
    it('should create invite with 6-char code and 24h expiry', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const mockInvite = {
        id: 'invite-1',
        code: 'AB12CD',
        familyId: 'family-123',
        createdBy: 'user-123',
        expiresAt: new Date(now + 24 * 60 * 60 * 1000),
      };

      mockPrismaService.invite.create.mockResolvedValue(mockInvite);

      const result = await service.createInvite('family-123', 'user-123');

      expect(result.code).toHaveLength(6);
      expect(result.expiresAt).toEqual(
        new Date(now + 24 * 60 * 60 * 1000),
      );
      expect(prisma.invite.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          familyId: 'family-123',
          createdBy: 'user-123',
        }),
      });

      jest.restoreAllMocks();
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const mockMember = {
        id: 'member-1',
        familyId: 'family-123',
        role: 'MEMBER',
        userId: 'user-456',
      };

      const mockUpdatedMember = {
        id: 'member-1',
        role: 'ADMIN',
        joinedAt: new Date(),
        userId: 'user-456',
        user: {
          id: 'user-456',
          name: 'Jane',
          email: 'jane@example.com',
          displayName: null,
          avatarUrl: null,
        },
      };

      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.familyMember.update.mockResolvedValue(
        mockUpdatedMember,
      );

      const result = await service.updateMemberRole(
        'family-123',
        'member-1',
        'ADMIN',
      );

      expect(result).toEqual(mockUpdatedMember);
      expect(prisma.familyMember.update).toHaveBeenCalledWith({
        where: { id: 'member-1' },
        data: { role: 'ADMIN' },
        select: memberSelect,
      });
    });

    it('should throw NotFoundException when member not found', async () => {
      mockPrismaService.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMemberRole('family-123', 'nonexistent', 'ADMIN'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateMemberRole('family-123', 'nonexistent', 'ADMIN'),
      ).rejects.toThrow('Member not found');
    });

    it('should throw BadRequestException when demoting last admin', async () => {
      const mockMember = {
        id: 'member-1',
        familyId: 'family-123',
        role: 'ADMIN',
        userId: 'user-123',
      };

      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.familyMember.count.mockResolvedValue(1);

      await expect(
        service.updateMemberRole('family-123', 'member-1', 'MEMBER'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateMemberRole('family-123', 'member-1', 'MEMBER'),
      ).rejects.toThrow('Cannot demote the last admin');
    });
  });

  describe('removeMember', () => {
    it('should remove member', async () => {
      const mockMember = {
        id: 'member-1',
        familyId: 'family-123',
        role: 'MEMBER',
        userId: 'user-456',
      };

      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.familyMember.delete.mockResolvedValue(mockMember);

      await service.removeMember('family-123', 'member-1');

      expect(prisma.familyMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-1' },
      });
    });

    it('should throw NotFoundException when member not found', async () => {
      mockPrismaService.familyMember.findUnique.mockResolvedValue(null);

      await expect(
        service.removeMember('family-123', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when removing last admin', async () => {
      const mockMember = {
        id: 'member-1',
        familyId: 'family-123',
        role: 'ADMIN',
        userId: 'user-123',
      };

      mockPrismaService.familyMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.familyMember.count.mockResolvedValue(1);

      await expect(
        service.removeMember('family-123', 'member-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.removeMember('family-123', 'member-1'),
      ).rejects.toThrow('Cannot remove the last admin');
    });
  });

  describe('joinFamily', () => {
    it('should join family with valid code', async () => {
      const mockInvite = {
        id: 'invite-1',
        code: 'AB12CD',
        familyId: 'family-123',
        usedBy: null,
        expiresAt: new Date(Date.now() + 100000),
      };

      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
        currency: 'INR',
        monthlyBudget: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        const tx = {
          invite: {
            findFirst: jest.fn().mockResolvedValue(mockInvite),
            update: jest.fn().mockResolvedValue({}),
          },
          familyMember: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          },
          family: {
            findUnique: jest.fn().mockResolvedValue(mockFamily),
          },
        };
        return cb(tx);
      });

      const result = await service.joinFamily('user-456', 'AB12CD');

      expect(result).toEqual(mockFamily);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw on invalid/expired code', async () => {
      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        const tx = {
          invite: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
        };
        return cb(tx);
      });

      await expect(
        service.joinFamily('user-456', 'BADCOD'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.joinFamily('user-456', 'BADCOD'),
      ).rejects.toThrow('Invalid or expired invite code');
    });

    it('should throw if already a member', async () => {
      const mockInvite = {
        id: 'invite-1',
        code: 'AB12CD',
        familyId: 'family-123',
        usedBy: null,
        expiresAt: new Date(Date.now() + 100000),
      };

      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        const tx = {
          invite: {
            findFirst: jest.fn().mockResolvedValue(mockInvite),
          },
          familyMember: {
            findFirst: jest.fn().mockResolvedValue({ id: 'member-1' }),
          },
        };
        return cb(tx);
      });

      await expect(
        service.joinFamily('user-456', 'AB12CD'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.joinFamily('user-456', 'AB12CD'),
      ).rejects.toThrow('Already a member of this family');
    });
  });
});
