import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { authRateLimiter } from '../middlewares/rateLimiter';
import { signupSchema, loginSchema } from '../validators/auth.validator';

const router = Router();

router.post('/signup', authRateLimiter, validate(signupSchema), AuthController.signup);
router.post('/login', authRateLimiter, validate(loginSchema), AuthController.login);
router.get('/me', authenticate, AuthController.getMe);

export default router;
