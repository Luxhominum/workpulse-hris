import { prisma } from '../../lib/prisma';

export class NotificationsService {
  static async create(data: {
    employee_id: string;
    type: 'LEAVE_APPROVAL' | 'OVERTIME_APPROVAL' | 'SHIFT_REMINDER' | 'SECURITY_ALERT' | 'SYSTEM';
    title: string;
    message: string;
  }) {
    try {
      return await prisma.notification.create({
        data: {
          employee_id: data.employee_id,
          type: data.type,
          title: data.title,
          message: data.message,
        },
      });
    } catch (err) {
      console.error('Failed to create notification:', err);
      return null;
    }
  }

  static async getMyNotifications(employeeId: string, limit = 50) {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { employee_id: employeeId },
        orderBy: { created_at: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { employee_id: employeeId, is_read: false },
      }),
    ]);

    return { notifications, unreadCount };
  }

  static async markAsRead(id: string, employeeId: string) {
    return prisma.notification.updateMany({
      where: { id, employee_id: employeeId },
      data: { is_read: true },
    });
  }

  static async markAllAsRead(employeeId: string) {
    return prisma.notification.updateMany({
      where: { employee_id: employeeId, is_read: false },
      data: { is_read: true },
    });
  }
}
