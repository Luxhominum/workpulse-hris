import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from './errorHandler';

export function authorizeRoles(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('User not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Role '${req.user.role}' lacks required permission (requires: ${allowedRoles.join(', ')})`
        )
      );
    }

    next();
  };
}
