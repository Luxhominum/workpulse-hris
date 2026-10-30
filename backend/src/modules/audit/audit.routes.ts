import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authenticate } from '../../middlewares/auth';
import { authorizeRoles } from '../../middlewares/rbac';
import { Role } from '@prisma/client';

const router = Router();

// Only ADMIN can access Audit Logs & UU PDP reports
router.use(authenticate, authorizeRoles(Role.ADMIN));

router.get('/', AuditController.getAll);
router.get('/export', AuditController.export);

export const auditRoutes = router;
