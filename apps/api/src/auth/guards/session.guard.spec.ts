// Mock better-auth modules to prevent ESM import errors
jest.mock('better-auth', () => ({
  betterAuth: jest.fn(),
}));
jest.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: jest.fn(),
}));
jest.mock('better-auth/node', () => ({
  fromNodeHeaders: jest.fn((headers: Record<string, string>) => headers),
}));
jest.mock('../auth');

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionGuard } from './session.guard';
import { AuthService } from '../auth.service';

function createMockExecutionContext(
  headers: Record<string, string> = {},
): ExecutionContext {
  const mockRequest = { headers };
  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  } as unknown as ExecutionContext;
}

describe('SessionGuard', () => {
  let guard: SessionGuard;
  let authService: { getSession: jest.Mock };

  beforeEach(async () => {
    authService = { getSession: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionGuard,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    guard = module.get<SessionGuard>(SessionGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow authenticated requests and attach user', async () => {
    const mockSession = {
      session: { id: 's1', userId: 'u1' },
      user: { id: 'u1', name: 'Test', email: 'test@example.com' },
    };
    authService.getSession.mockResolvedValue(mockSession);

    const context = createMockExecutionContext({
      authorization: 'Bearer token',
    });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(request['user']).toEqual(mockSession.user);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(request['session']).toEqual(mockSession.session);
  });

  it('should throw UnauthorizedException when no session', async () => {
    authService.getSession.mockResolvedValue(null);

    const context = createMockExecutionContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when session has no user', async () => {
    authService.getSession.mockResolvedValue({ session: {}, user: null });

    const context = createMockExecutionContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
