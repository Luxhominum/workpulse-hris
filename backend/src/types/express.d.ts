import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  department: string;
  office_id: string | null;
  shift_id: string | null;
  is_wfh_allowed: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
