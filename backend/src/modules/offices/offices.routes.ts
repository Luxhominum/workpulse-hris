import { Router } from 'express';
import { OfficesController } from './offices.controller';
import { validateBody } from '../../middlewares/validate';
import { createOfficeSchema, updateOfficeSchema } from './offices.schema';
import { authenticate } from '../../middlewares/auth';
import { authorizeRoles } from '../../middlewares/rbac';
import { Role } from '@prisma/client';

const router = Router();

// All office routes require authentication
router.use(authenticate);

// Authenticated employees can view offices for geofence validation
router.get('/', OfficesController.getAll);
router.get('/:id', OfficesController.getById);

// Only Admin can create, update, delete offices
router.post('/', authorizeRoles(Role.ADMIN), validateBody(createOfficeSchema), OfficesController.create);
router.put('/:id', authorizeRoles(Role.ADMIN), validateBody(updateOfficeSchema), OfficesController.update);
router.delete('/:id', authorizeRoles(Role.ADMIN), OfficesController.delete);

export const officeRoutes = router;
