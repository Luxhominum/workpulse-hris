import { Router } from 'express';
import multer from 'multer';
import { EmployeesController } from './employees.controller';
import { validateBody } from '../../middlewares/validate';
import { createEmployeeSchema, updateEmployeeSchema } from './employees.schema';
import { authenticate } from '../../middlewares/auth';
import { authorizeRoles } from '../../middlewares/rbac';
import { Role } from '@prisma/client';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const router = Router();

// All employee routes require authentication
router.use(authenticate);

// Admin and Manager can view employee directory
router.get('/', authorizeRoles(Role.ADMIN, Role.MANAGER), EmployeesController.getAll);
router.get('/:id', authorizeRoles(Role.ADMIN, Role.MANAGER), EmployeesController.getById);

// Excel Import endpoint (supports file upload or local fallback)
router.post('/import-excel', authorizeRoles(Role.ADMIN), upload.single('file'), EmployeesController.importExcel);

// Only Admin can create, edit, archive, restore, or delete employee profiles
router.post('/', authorizeRoles(Role.ADMIN), validateBody(createEmployeeSchema), EmployeesController.create);
router.put('/:id', authorizeRoles(Role.ADMIN), validateBody(updateEmployeeSchema), EmployeesController.update);
router.patch('/:id/archive', authorizeRoles(Role.ADMIN), EmployeesController.archive);
router.patch('/:id/restore', authorizeRoles(Role.ADMIN), EmployeesController.restore);
router.delete('/:id', authorizeRoles(Role.ADMIN), EmployeesController.delete);

export const employeeRoutes = router;
