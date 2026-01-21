import { Router } from 'express';
import { 
  getInviteCodes, 
  generateInviteCode, 
  deleteInviteCode, 
  getUsers, 
  getMfaStatus,
  listFiles,
  readFileContent,
  saveFileContent
} from '../controllers/adminController.js';
import { adminAuthMiddleware } from '../middlewares/auth.js';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/mfa/status', getMfaStatus);
router.get('/invite-codes', getInviteCodes);
router.post('/invite-codes', generateInviteCode);
router.delete('/invite-codes/:id', deleteInviteCode);
router.get('/users', getUsers);

// 文件管理相关
router.get('/files/list', listFiles);
router.get('/files/read', readFileContent);
router.post('/files/save', saveFileContent);

export default router;
