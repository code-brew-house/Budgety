import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

// Mock better-auth/node module
jest.mock('better-auth/node', () => ({
  fromNodeHeaders: jest.fn(
    (headers: unknown) => headers as Record<string, string>,
  ),
}));

// Mock the auth module
jest.mock('./auth', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

import { auth } from './auth';

const mockGetSession = auth.api.getSession as jest.Mock;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return session when valid', async () => {
    const mockSession = {
      session: { id: 's1', userId: 'u1' },
      user: { id: 'u1', name: 'Test', email: 'test@example.com' },
    };
    mockGetSession.mockResolvedValue(mockSession);

    const result = await service.getSession({});
    expect(result).toEqual(mockSession);
  });

  it('should return null when no session', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await service.getSession({});
    expect(result).toBeNull();
  });
});
