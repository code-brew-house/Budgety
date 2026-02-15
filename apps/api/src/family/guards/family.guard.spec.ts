import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FamilyGuard } from './family.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { FamilyRole } from '@prisma/client';

function createMockExecutionContext(
  user: { id: string } | undefined,
  params: Record<string, string> = {},
): ExecutionContext {
  const mockRequest = { user, params };
  const mockHandler = jest.fn();
  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
    getHandler: () => mockHandler,
    getClass: () => FamilyGuard,
  } as unknown as ExecutionContext;
}

describe('FamilyGuard', () => {
  let guard: FamilyGuard;
  let prisma: { familyMember: { findUnique: jest.Mock } };
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    prisma = { familyMember: { findUnique: jest.fn() } };
    reflector = { getAllAndOverride: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get<FamilyGuard>(FamilyGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow ADMIN for ADMIN-required route', async () => {
    prisma.familyMember.findUnique.mockResolvedValue({
      userId: 'u1',
      familyId: 'f1',
      role: FamilyRole.ADMIN,
    });
    reflector.getAllAndOverride.mockReturnValue(FamilyRole.ADMIN);

    const context = createMockExecutionContext(
      { id: 'u1' },
      { familyId: 'f1' },
    );
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const request = context.switchToHttp().getRequest();
    expect(request['familyMember']).toEqual({
      userId: 'u1',
      familyId: 'f1',
      role: FamilyRole.ADMIN,
    });
  });

  it('should allow ADMIN for MEMBER-required route', async () => {
    prisma.familyMember.findUnique.mockResolvedValue({
      userId: 'u1',
      familyId: 'f1',
      role: FamilyRole.ADMIN,
    });
    reflector.getAllAndOverride.mockReturnValue(FamilyRole.MEMBER);

    const context = createMockExecutionContext(
      { id: 'u1' },
      { familyId: 'f1' },
    );
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow MEMBER for MEMBER-required route', async () => {
    prisma.familyMember.findUnique.mockResolvedValue({
      userId: 'u1',
      familyId: 'f1',
      role: FamilyRole.MEMBER,
    });
    reflector.getAllAndOverride.mockReturnValue(FamilyRole.MEMBER);

    const context = createMockExecutionContext(
      { id: 'u1' },
      { familyId: 'f1' },
    );
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should reject MEMBER for ADMIN-required route', async () => {
    prisma.familyMember.findUnique.mockResolvedValue({
      userId: 'u1',
      familyId: 'f1',
      role: FamilyRole.MEMBER,
    });
    reflector.getAllAndOverride.mockReturnValue(FamilyRole.ADMIN);

    const context = createMockExecutionContext(
      { id: 'u1' },
      { familyId: 'f1' },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Admin access required',
    );
  });

  it('should reject non-member', async () => {
    prisma.familyMember.findUnique.mockResolvedValue(null);
    reflector.getAllAndOverride.mockReturnValue(FamilyRole.MEMBER);

    const context = createMockExecutionContext(
      { id: 'u1' },
      { familyId: 'f1' },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Not a member of this family',
    );
  });

  it('should reject when no user on request', async () => {
    const context = createMockExecutionContext(undefined, { familyId: 'f1' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Authentication required',
    );
  });

  it('should reject when no familyId in params', async () => {
    const context = createMockExecutionContext({ id: 'u1' }, {});

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Family ID required',
    );
  });

  it('should read familyId from fid param', async () => {
    prisma.familyMember.findUnique.mockResolvedValue({
      userId: 'u1',
      familyId: 'f1',
      role: FamilyRole.MEMBER,
    });
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const context = createMockExecutionContext({ id: 'u1' }, { fid: 'f1' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(prisma.familyMember.findUnique).toHaveBeenCalledWith({
      where: { userId_familyId: { userId: 'u1', familyId: 'f1' } },
    });
  });
});
