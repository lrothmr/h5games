import { Router } from 'express';
import { adminLogin, userRegister, userLogin, setupMfa, verifyAndEnableMfa, changeAdminPassword } from '../controllers/authController.js';
import { adminAuthMiddleware } from '../middlewares/auth.js';

const router = Router();

router.post('/admin/login', adminLogin);
router.post('/admin/mfa/setup', adminAuthMiddleware, setupMfa);
router.post('/admin/mfa/verify', adminAuthMiddleware, verifyAndEnableMfa);
router.post('/admin/change-password', adminAuthMiddleware, changeAdminPassword);
router.post('/register', userRegister);
router.post('/login', userLogin);

export default router;
