import express from 'express';
import { getDashboardKPIs } from '../controllers/dashboardController.js';
import { authenticateToken, requireOrganizationContext } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard', authenticateToken, requireOrganizationContext, getDashboardKPIs);

export default router;
