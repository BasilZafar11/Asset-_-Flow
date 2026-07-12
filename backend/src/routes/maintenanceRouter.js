import express from 'express';
import { listRequests, raiseRequest, updateStatus } from '../controllers/maintenanceController.js';
import { authenticateToken, requireOrganizationContext, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/maintenance', authenticateToken, requireOrganizationContext, listRequests);
router.post('/maintenance', authenticateToken, requireOrganizationContext, raiseRequest);
router.put('/maintenance/:id/status', authenticateToken, requireOrganizationContext, requireRole(['Asset Manager', 'Admin']), updateStatus);

export default router;
