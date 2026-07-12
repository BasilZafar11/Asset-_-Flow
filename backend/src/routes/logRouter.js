import express from 'express';
import { listLogs } from '../controllers/logController.js';
import { authenticateToken, requireOrganizationContext, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/logs', authenticateToken, requireOrganizationContext, requireRole(['Admin']), listLogs);

export default router;
