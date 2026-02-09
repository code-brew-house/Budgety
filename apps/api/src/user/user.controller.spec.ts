import { Test, TestingModule } from '@nestjs/testing';
import { UpdateUserDto } from './dto/update-user.dto';

jest.mock('better-auth', () => ({
  betterAuth: jest.fn(),
}));

jest.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: jest.fn(),
}));

jest.mock('better-auth/node', () => ({
  fromNodeHeaders: jest.fn(),
}));

import { UserController } from './user.controller';
import { UserService } from './user.service';
import { SessionGuard } from '../auth/guards/session.guard';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUserService = {
    findById: jest.fn(),
    update: jest.fn(),
  };

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    })
      .overrideGuard(SessionGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('should return the current user', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await controller.getMe(mockUser);

      expect(result).toEqual(mockUser);
      expect(service.findById).toHaveBeenCalledWith('user-123');
    });
  });

  describe('updateMe', () => {
    it('should update and return the current user', async () => {
      const updateDto: UpdateUserDto = {
        displayName: 'Updated Name',
      };

      const updatedUser = {
        ...mockUser,
        displayName: 'Updated Name',
      };

      mockUserService.update.mockResolvedValue(updatedUser);

      const result = await controller.updateMe(mockUser, updateDto);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith('user-123', updateDto);
    });

    it('should update avatarUrl', async () => {
      const updateDto: UpdateUserDto = {
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      const updatedUser = {
        ...mockUser,
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      mockUserService.update.mockResolvedValue(updatedUser);

      const result = await controller.updateMe(mockUser, updateDto);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith('user-123', updateDto);
    });
  });
});
