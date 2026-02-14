/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FamilyService } from './family.service';
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
      create: jest.fn(),
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
});
