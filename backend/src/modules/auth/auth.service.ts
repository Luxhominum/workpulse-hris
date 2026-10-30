import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../middlewares/errorHandler';
import { LoginInput } from './auth.schema';
import { sanitizeEmployee } from '../employees/employees.service';

export class AuthService {
  static async login(data: LoginInput) {
    const employee = await prisma.employee.findUnique({
      where: { email: data.email.toLowerCase().trim() },
      include: {
        office: true,
        shift: true,
      },
    });

    if (!employee) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!employee.is_active) {
      throw ApiError.forbidden('Akun ini telah dinonaktifkan atau diarsipkan oleh HR.');
    }

    const isMatch = await bcrypt.compare(data.password, employee.password_hash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const payload = {
      userId: employee.id,
      role: employee.role,
      email: employee.email,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    const { password_hash, ...safeUser } = employee;

    return {
      token,
      user: sanitizeEmployee(safeUser, false),
    };
  }

  static async getMe(userId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      include: {
        office: true,
        shift: true,
        company: true,
      },
    });

    if (!employee) {
      throw ApiError.notFound('Employee profile not found');
    }

    const { password_hash, ...safeUser } = employee;
    return sanitizeEmployee(safeUser, false);
  }
}
