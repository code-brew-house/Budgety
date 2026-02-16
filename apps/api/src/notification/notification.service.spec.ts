import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: {
    notification: Record<string, jest.Mock>;
    familyMember: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      familyMember: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('create', () => {
    it('should create a notification', async () => {
      const expected = {
        id: '1',
        type: 'EXPENSE_ADDED',
        title: 'New expense',
        body: 'Test',
        userId: 'u1',
      };
      prisma.notification.create.mockResolvedValue(expected);

      const result = await service.create({
        type: 'EXPENSE_ADDED',
        title: 'New expense',
        body: 'Test',
        userId: 'u1',
        familyId: 'f1',
      });

      expect(result).toEqual(expected);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          type: 'EXPENSE_ADDED',
          title: 'New expense',
          body: 'Test',
          userId: 'u1',
          familyId: 'f1',
          data: undefined,
        },
      });
    });
  });

  describe('findAllForUser', () => {
    it('should return paginated notifications', async () => {
      const notifications = [{ id: '1' }, { id: '2' }];
      prisma.notification.findMany.mockResolvedValue(notifications);
      prisma.notification.count.mockResolvedValue(2);

      const result = await service.findAllForUser('u1', { limit: 20 });

      expect(result.data).toEqual(notifications);
      expect(result.total).toBe(2);
    });

    it('should filter unread only', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findAllForUser('u1', { limit: 20, unreadOnly: true });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', isRead: false },
        }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      prisma.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('u1');

      expect(result).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const notification = { id: '1', isRead: true };
      prisma.notification.update.mockResolvedValue(notification);

      const result = await service.markAsRead('1', 'u1');

      expect(result.isRead).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      await service.markAllAsRead('u1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('dismiss', () => {
    it('should delete a notification', async () => {
      prisma.notification.delete.mockResolvedValue({ id: '1' });

      await service.dismiss('1', 'u1');

      expect(prisma.notification.delete).toHaveBeenCalledWith({
        where: { id: '1', userId: 'u1' },
      });
    });
  });

  describe('notifyFamilyMembers', () => {
    it('should create notifications for all family members except excluded user', async () => {
      prisma.familyMember.findMany.mockResolvedValue([
        { userId: 'u1' },
        { userId: 'u2' },
        { userId: 'u3' },
      ]);
      prisma.notification.create.mockResolvedValue({});

      await service.notifyFamilyMembers({
        familyId: 'f1',
        excludeUserId: 'u1',
        type: 'EXPENSE_ADDED',
        title: 'New expense',
        body: 'Alice added an expense of ₹500',
      });

      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    });
  });
});
