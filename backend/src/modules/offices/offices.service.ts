import { prisma } from '../../lib/prisma';
import { ApiError } from '../../middlewares/errorHandler';
import { CreateOfficeInput, UpdateOfficeInput } from './offices.schema';

export class OfficesService {
  static async getAll() {
    return prisma.office.findMany({
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  static async getById(id: string) {
    const office = await prisma.office.findUnique({
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

    if (!office) {
      throw ApiError.notFound('Office not found');
    }

    return office;
  }

  static async create(data: CreateOfficeInput) {
    return prisma.office.create({
      data,
    });
  }

  static async update(id: string, data: UpdateOfficeInput) {
    await this.getById(id);
    return prisma.office.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    await this.getById(id);
    return prisma.office.delete({
      where: { id },
    });
  }
}
