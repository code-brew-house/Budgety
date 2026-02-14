/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

jest.mock('better-auth', () => ({
  betterAuth: jest.fn(),
}));

jest.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: jest.fn(),
}));

jest.mock('better-auth/node', () => ({
  fromNodeHeaders: jest.fn(),
}));

import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { FamilyGuard } from './guards/family.guard';

describe('FamilyController', () => {
  let controller: FamilyController;
  let service: FamilyService;

  const mockFamilyService = {
    create: jest.fn(),
    findAllByUser: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createInvite: jest.fn(),
    joinFamily: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
  };

  const mockUser = { id: 'user-123' };

  const mockFamily = {
    id: 'family-456',
    name: 'Test Family',
    currency: 'USD',
    monthlyBudget: 5000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FamilyController],
      providers: [
        {
          provide: FamilyService,
          useValue: mockFamilyService,
        },
      ],
    })
      .overrideGuard(SessionGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(FamilyGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<FamilyController>(FamilyController);
    service = module.get<FamilyService>(FamilyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a family and return it', async () => {
      const dto: CreateFamilyDto = {
        name: 'Test Family',
        currency: 'USD',
        monthlyBudget: 5000,
      };

      mockFamilyService.create.mockResolvedValue(mockFamily);

      const result = await controller.create(mockUser, dto);

      expect(result).toEqual(mockFamily);
      expect(service.create).toHaveBeenCalledWith('user-123', dto);
    });
  });

  describe('findAll', () => {
    it('should return all families for the user', async () => {
      const families = [mockFamily];
      mockFamilyService.findAllByUser.mockResolvedValue(families);

      const result = await controller.findAll(mockUser);

      expect(result).toEqual(families);
      expect(service.findAllByUser).toHaveBeenCalledWith('user-123');
    });
  });

  describe('findOne', () => {
    it('should return a family by id', async () => {
      mockFamilyService.findById.mockResolvedValue(mockFamily);

      const result = await controller.findOne('family-456');

      expect(result).toEqual(mockFamily);
      expect(service.findById).toHaveBeenCalledWith('family-456');
    });
  });

  describe('update', () => {
    it('should update and return the family', async () => {
      const dto: UpdateFamilyDto = {
        name: 'Updated Family',
      };

      const updatedFamily = { ...mockFamily, name: 'Updated Family' };
      mockFamilyService.update.mockResolvedValue(updatedFamily);

      const result = await controller.update('family-456', dto);

      expect(result).toEqual(updatedFamily);
      expect(service.update).toHaveBeenCalledWith('family-456', dto);
    });
  });

  describe('remove', () => {
    it('should remove the family', async () => {
      mockFamilyService.remove.mockResolvedValue(mockFamily);

      const result = await controller.remove('family-456');

      expect(result).toEqual(mockFamily);
      expect(service.remove).toHaveBeenCalledWith('family-456');
    });
  });

  describe('createInvite', () => {
    it('should create an invite and return code with expiry', async () => {
      const mockInviteResult = {
        code: 'AB12CD',
        expiresAt: new Date(),
      };

      mockFamilyService.createInvite.mockResolvedValue(mockInviteResult);

      const result = await controller.createInvite('family-456', mockUser);

      expect(result).toEqual(mockInviteResult);
      expect(service.createInvite).toHaveBeenCalledWith(
        'family-456',
        'user-123',
      );
    });
  });

  describe('join', () => {
    it('should join a family with a valid code', async () => {
      mockFamilyService.joinFamily.mockResolvedValue(mockFamily);

      const result = await controller.join(mockUser, { code: 'AB12CD' });

      expect(result).toEqual(mockFamily);
      expect(service.joinFamily).toHaveBeenCalledWith('user-123', 'AB12CD');
    });
  });

  describe('updateMemberRole', () => {
    it('should update a member role', async () => {
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

      const dto: UpdateMemberDto = { role: 'ADMIN' as any };
      mockFamilyService.updateMemberRole.mockResolvedValue(mockUpdatedMember);

      const result = await controller.updateMemberRole(
        'family-456',
        'member-1',
        dto,
      );

      expect(result).toEqual(mockUpdatedMember);
      expect(service.updateMemberRole).toHaveBeenCalledWith(
        'family-456',
        'member-1',
        'ADMIN',
      );
    });
  });

  describe('removeMember', () => {
    it('should remove a member', async () => {
      mockFamilyService.removeMember.mockResolvedValue(undefined);

      await controller.removeMember('family-456', 'member-1');

      expect(service.removeMember).toHaveBeenCalledWith(
        'family-456',
        'member-1',
      );
    });
  });
});
