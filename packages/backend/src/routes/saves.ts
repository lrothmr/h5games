import { Router } from 'express';
import {
  getAutoSave,
  setAutoSave,
  uploadSave,
  downloadSave,
  getAllSaves,
} from '../controllers/saveController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/auto-save', getAutoSave);
router.post('/auto-save', setAutoSave);
router.post('/upload', uploadSave);
router.post('/download', downloadSave);
router.get('/list', getAllSaves);

export default router;
