import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateBody } from '../../middlewares/validate';
import { loginSchema } from './auth.schema';
import { authenticate } from '../../middlewares/auth';
import { authRateLimiter } from '../../middlewares/security';

const router = Router();

router.post('/login', authRateLimiter, validateBody(loginSchema), AuthController.login);
router.get('/me', authenticate, AuthController.me);

export const authRoutes = router;
