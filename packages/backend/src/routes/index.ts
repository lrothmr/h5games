import { Router } from 'express';
import authRoutes from './auth.js';
import gameRoutes from './games.js';
import saveRoutes from './saves.js';
import adminRoutes from './admin.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/games', gameRoutes);
router.use('/saves', saveRoutes);
router.use('/admin', adminRoutes);

export default router;
