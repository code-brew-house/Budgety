import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        emailVerified: true,
        image: null,
        displayName: 'Johnny',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-123');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('nonexistent')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('update', () => {
    it('should update user displayName', async () => {
      const updateDto: UpdateUserDto = {
        displayName: 'New Display Name',
      };

      const mockUpdatedUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        emailVerified: true,
        image: null,
        displayName: 'New Display Name',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.update('user-123', updateDto);

      expect(result).toEqual(mockUpdatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updateDto,
      });
    });

    it('should update user avatarUrl', async () => {
      const updateDto: UpdateUserDto = {
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      const mockUpdatedUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        emailVerified: true,
        image: null,
        displayName: 'Johnny',
        avatarUrl: 'https://example.com/new-avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.update('user-123', updateDto);

      expect(result).toEqual(mockUpdatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updateDto,
      });
    });

    it('should update both displayName and avatarUrl', async () => {
      const updateDto: UpdateUserDto = {
        displayName: 'Updated Name',
        avatarUrl: 'https://example.com/updated-avatar.jpg',
      };

      const mockUpdatedUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        emailVerified: true,
        image: null,
        displayName: 'Updated Name',
        avatarUrl: 'https://example.com/updated-avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.update('user-123', updateDto);

      expect(result).toEqual(mockUpdatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updateDto,
      });
    });
  });
});
