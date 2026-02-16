import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateNotificationDto {
  type: string;
  title: string;
  body: string;
  userId: string;
  familyId?: string;
  data?: Record<string, unknown>;
}

interface NotifyFamilyDto {
  familyId: string;
  excludeUserId?: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        type: dto.type,
        title: dto.title,
        body: dto.body,
        userId: dto.userId,
        familyId: dto.familyId,
        data: dto.data,
      },
    });
  }

  async findAllForUser(
    userId: string,
    options: { limit?: number; cursor?: string; unreadOnly?: boolean },
  ) {
    const limit = options.limit || 20;
    const where: { userId: string; isRead?: boolean } = { userId };
    if (options.unreadOnly) {
      where.isRead = false;
    }

    const findOptions: {
      where: typeof where;
      orderBy: { createdAt: 'desc' };
      take: number;
      skip?: number;
      cursor?: { id: string };
    } = {
      where,
      orderBy: { createdAt: 'desc' as const },
      take: limit,
    };

    if (options.cursor) {
      findOptions.cursor = { id: options.cursor };
      findOptions.skip = 1;
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany(findOptions),
      this.prisma.notification.count({ where }),
    ]);

    return { data, total };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.update({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async dismiss(id: string, userId: string) {
    return this.prisma.notification.delete({
      where: { id, userId },
    });
  }

  async notifyFamilyMembers(dto: NotifyFamilyDto) {
    const members = await this.prisma.familyMember.findMany({
      where: { familyId: dto.familyId },
      select: { userId: true },
    });

    const targetUserIds = members
      .map((m) => m.userId)
      .filter((id) => id !== dto.excludeUserId);

    await Promise.all(
      targetUserIds.map((userId) =>
        this.create({
          type: dto.type,
          title: dto.title,
          body: dto.body,
          userId,
          familyId: dto.familyId,
          data: dto.data,
        }),
      ),
    );
  }
}
