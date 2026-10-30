import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { ApiError } from './errorHandler';
import { Role } from '@prisma/client';

interface JwtPayload {
  userId: string;
  role: Role;
  email: string;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      throw ApiError.unauthorized('Missing or malformed Authorization header or token query parameter');
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Session expired. Please log in again.');
      }
      throw ApiError.unauthorized('Invalid authentication token');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        department: true,
        office_id: true,
        shift_id: true,
        is_wfh_allowed: true,
      },
    });

    if (!employee) {
      throw ApiError.unauthorized('User associated with token no longer exists');
    }

    req.user = employee;
    next();
  } catch (error) {
    next(error);
  }
}
