import { Router } from 'express';
import { ShiftsController } from './shifts.controller';
import { validateBody } from '../../middlewares/validate';
import { createShiftSchema, updateShiftSchema } from './shifts.schema';
import { authenticate } from '../../middlewares/auth';
import { authorizeRoles } from '../../middlewares/rbac';
import { Role } from '@prisma/client';

const router = Router();

// All shift routes require authentication
router.use(authenticate);

// All authenticated roles can view shifts (needed for dropdowns & shifts info)
router.get('/', ShiftsController.getAll);
router.get('/:id', ShiftsController.getById);

// Only Admin can create, update, delete shifts
router.post('/', authorizeRoles(Role.ADMIN), validateBody(createShiftSchema), ShiftsController.create);
router.put('/:id', authorizeRoles(Role.ADMIN), validateBody(updateShiftSchema), ShiftsController.update);
router.delete('/:id', authorizeRoles(Role.ADMIN), ShiftsController.delete);

export const shiftRoutes = router;
