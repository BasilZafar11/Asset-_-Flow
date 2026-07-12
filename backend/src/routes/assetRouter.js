import express from 'express';
import { listAssets, getAsset, registerAsset, updateAsset } from '../controllers/assetController.js';
import { authenticateToken, requireOrganizationContext, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/assets', authenticateToken, requireOrganizationContext, listAssets);
router.get('/assets/:tag', authenticateToken, requireOrganizationContext, getAsset);
router.post('/assets', authenticateToken, requireOrganizationContext, requireRole(['Asset Manager', 'Admin']), registerAsset);
router.put('/assets/:tag', authenticateToken, requireOrganizationContext, requireRole(['Asset Manager', 'Admin']), updateAsset);

export default router;
