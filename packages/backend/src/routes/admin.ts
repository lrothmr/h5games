import { Router } from 'express';
import { getInviteCodes, generateInviteCode, deleteInviteCode, getUsers } from '../controllers/adminController.js';
import { adminAuthMiddleware } from '../middlewares/auth.js';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/invite-codes', getInviteCodes);
router.post('/invite-codes', generateInviteCode);
router.delete('/invite-codes/:id', deleteInviteCode);
router.get('/users', getUsers);

export default router;
