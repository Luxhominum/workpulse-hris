import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middlewares/errorHandler';
import { CreateShiftInput, UpdateShiftInput } from './shifts.schema';

export class ShiftsService {
  static async getAll() {
    return prisma.shift.findMany({
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  static async getById(id: string) {
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        employees: {
          select: {
            id: true,
            full_name: true,
            email: true,
            role: true,
            department: true,
          },
        },
      },
    });

    if (!shift) {
      throw ApiError.notFound('Shift not found');
    }

    return shift;
  }

  static async create(data: CreateShiftInput) {
    return prisma.shift.create({
      data,
    });
  }

  static async update(id: string, data: UpdateShiftInput) {
    await this.getById(id);
    return prisma.shift.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    await this.getById(id);
    return prisma.shift.delete({
      where: { id },
    });
  }
}
