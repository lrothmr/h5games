import { Router } from 'express';
import {
  getGames,
  getGame,
  createGame,
  updateGame,
  deleteGame,
  uploadGame,
  uploadGameImage,
  recordClick,
  recordLike,
  getLikes,
  uploadGameChunk,
  mergeGameChunks,
} from '../controllers/gameController.js';
import { adminAuthMiddleware } from '../middlewares/auth.js';
import { uploadZip, uploadImage, uploadChunk } from '../middlewares/upload.js';

const router = Router();

router.get('/', getGames);
router.get('/likes', getLikes);
router.get('/:id', getGame);

router.post('/', adminAuthMiddleware, createGame);
router.put('/:id', adminAuthMiddleware, updateGame);
router.delete('/:id', adminAuthMiddleware, deleteGame);

router.post('/upload', adminAuthMiddleware, uploadZip.single('file'), uploadGame);
router.post('/upload-chunk', adminAuthMiddleware, uploadChunk.single('file'), uploadGameChunk);
router.post('/upload-merge', adminAuthMiddleware, mergeGameChunks);
router.post('/:id/image', adminAuthMiddleware, uploadImage.single('image'), uploadGameImage);

router.post('/click', recordClick);
router.post('/like', recordLike);

export default router;
