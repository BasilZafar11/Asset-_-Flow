import express from 'express';
import { listCycles, getCycleDetails, createCycle, startCycle, updateItem, completeCycle } from '../controllers/auditController.js';
import { authenticateToken, requireOrganizationContext, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/audits', authenticateToken, requireOrganizationContext, listCycles);
router.get('/audits/:id', authenticateToken, requireOrganizationContext, getCycleDetails);
router.post('/audits', authenticateToken, requireOrganizationContext, requireRole(['Asset Manager', 'Admin']), createCycle);
router.post('/audits/:id/start', authenticateToken, requireOrganizationContext, requireRole(['Asset Manager', 'Admin']), startCycle);
router.put('/audits/:id/items/:itemId', authenticateToken, requireOrganizationContext, requireRole(['Asset Manager', 'Admin']), updateItem);
router.post('/audits/:id/complete', authenticateToken, requireOrganizationContext, requireRole(['Asset Manager', 'Admin']), completeCycle);

export default router;
