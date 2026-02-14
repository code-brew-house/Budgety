/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoryService } from './category.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const categorySelect = {
  id: true,
  name: true,
  icon: true,
  isDefault: true,
  familyId: true,
};

describe('CategoryService', () => {
  let service: CategoryService;
  let prisma: PrismaService;

  const mockPrismaService = {
    category: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return defaults and family-specific categories', async () => {
      const defaultCategory = {
        id: 'cat-1',
        name: 'Food',
        icon: null,
        isDefault: true,
        familyId: null,
      };

      const customCategory = {
        id: 'cat-2',
        name: 'Pet Supplies',
        icon: '🐕',
        isDefault: false,
        familyId: 'family-123',
      };

      mockPrismaService.category.findMany.mockResolvedValue([
        customCategory,
        defaultCategory,
      ]);

      const result = await service.findAll('family-123');

      expect(result).toEqual([customCategory, defaultCategory]);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { isDefault: true, familyId: null },
            { familyId: 'family-123' },
          ],
        },
        select: categorySelect,
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('create', () => {
    it('should create a custom category with familyId and isDefault false', async () => {
      const dto: CreateCategoryDto = {
        name: 'Pet Supplies',
        icon: '🐕',
      };

      const mockCategory = {
        id: 'cat-1',
        name: 'Pet Supplies',
        icon: '🐕',
        isDefault: false,
        familyId: 'family-123',
      };

      mockPrismaService.category.create.mockResolvedValue(mockCategory);

      const result = await service.create('family-123', dto);

      expect(result).toEqual(mockCategory);
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          name: 'Pet Supplies',
          icon: '🐕',
          isDefault: false,
          familyId: 'family-123',
        },
        select: categorySelect,
      });
    });
  });

  describe('update', () => {
    it('should update a custom category', async () => {
      const dto: UpdateCategoryDto = { name: 'Updated Name' };

      const existingCategory = {
        id: 'cat-1',
        name: 'Pet Supplies',
        icon: null,
        isDefault: false,
        familyId: 'family-123',
      };

      const updatedCategory = {
        ...existingCategory,
        name: 'Updated Name',
      };

      mockPrismaService.category.findUnique.mockResolvedValue(
        existingCategory,
      );
      mockPrismaService.category.update.mockResolvedValue(updatedCategory);

      const result = await service.update('cat-1', 'family-123', dto);

      expect(result).toEqual(updatedCategory);
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: dto,
        select: categorySelect,
      });
    });

    it('should throw NotFoundException when category not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', 'family-123', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('nonexistent', 'family-123', { name: 'Test' }),
      ).rejects.toThrow('Category not found');
    });

    it('should throw NotFoundException when category belongs to another family', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Other',
        familyId: 'other-family',
        isDefault: false,
      });

      await expect(
        service.update('cat-1', 'family-123', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a custom category', async () => {
      const existingCategory = {
        id: 'cat-1',
        name: 'Pet Supplies',
        icon: null,
        isDefault: false,
        familyId: 'family-123',
      };

      mockPrismaService.category.findUnique.mockResolvedValue(
        existingCategory,
      );
      mockPrismaService.category.delete.mockResolvedValue(existingCategory);

      await service.remove('cat-1', 'family-123');

      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
    });

    it('should throw NotFoundException when category not found', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('nonexistent', 'family-123'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.remove('nonexistent', 'family-123'),
      ).rejects.toThrow('Category not found');
    });

    it('should throw NotFoundException when trying to remove a default category', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Food',
        isDefault: true,
        familyId: null,
      });

      await expect(
        service.remove('cat-1', 'family-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
