import { Router } from 'express';
import { RosterController } from './roster.controller';
import { authenticate } from '../../middlewares/auth';
import { authorizeRoles } from '../../middlewares/rbac';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Mobile ESS: Get personal scheduled roster
router.get('/my-schedule', RosterController.getMySchedule);

// Admin & Manager: Get full monthly roster
router.get('/', authorizeRoles(Role.ADMIN, Role.MANAGER), RosterController.getMonthlyRoster);

// Admin: Assign shift roster
router.post('/assign', authorizeRoles(Role.ADMIN), RosterController.assignRoster);

// Admin: Reset shift roster override
router.post('/reset', authorizeRoles(Role.ADMIN), RosterController.deleteRoster);

export const rosterRoutes = router;
