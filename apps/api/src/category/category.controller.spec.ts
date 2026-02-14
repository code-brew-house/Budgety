/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

jest.mock('better-auth', () => ({
  betterAuth: jest.fn(),
}));

jest.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: jest.fn(),
}));

jest.mock('better-auth/node', () => ({
  fromNodeHeaders: jest.fn(),
}));

import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { FamilyGuard } from '../family/guards/family.guard';

describe('CategoryController', () => {
  let controller: CategoryController;
  let service: CategoryService;

  const mockCategoryService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockDefaultCategory = {
    id: 'cat-1',
    name: 'Food',
    icon: null,
    isDefault: true,
    familyId: null,
  };

  const mockCustomCategory = {
    id: 'cat-2',
    name: 'Pet Supplies',
    icon: '🐕',
    isDefault: false,
    familyId: 'family-456',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    })
      .overrideGuard(SessionGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(FamilyGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<CategoryController>(CategoryController);
    service = module.get<CategoryService>(CategoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all categories for the family', async () => {
      const categories = [mockDefaultCategory, mockCustomCategory];
      mockCategoryService.findAll.mockResolvedValue(categories);

      const result = await controller.findAll('family-456');

      expect(result).toEqual(categories);
      expect(service.findAll).toHaveBeenCalledWith('family-456');
    });
  });

  describe('create', () => {
    it('should create a custom category', async () => {
      const dto: CreateCategoryDto = {
        name: 'Pet Supplies',
        icon: '🐕',
      };

      mockCategoryService.create.mockResolvedValue(mockCustomCategory);

      const result = await controller.create('family-456', dto);

      expect(result).toEqual(mockCustomCategory);
      expect(service.create).toHaveBeenCalledWith('family-456', dto);
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const dto: UpdateCategoryDto = { name: 'Updated Name' };
      const updatedCategory = { ...mockCustomCategory, name: 'Updated Name' };

      mockCategoryService.update.mockResolvedValue(updatedCategory);

      const result = await controller.update('family-456', 'cat-2', dto);

      expect(result).toEqual(updatedCategory);
      expect(service.update).toHaveBeenCalledWith(
        'cat-2',
        'family-456',
        dto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a category', async () => {
      mockCategoryService.remove.mockResolvedValue(undefined);

      await controller.remove('family-456', 'cat-2');

      expect(service.remove).toHaveBeenCalledWith('cat-2', 'family-456');
    });
  });
});
