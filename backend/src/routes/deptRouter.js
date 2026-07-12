import express from 'express';
import { listDepts, createDept, updateDept } from '../controllers/deptController.js';
import { authenticateToken, requireOrganizationContext, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/departments', authenticateToken, requireOrganizationContext, listDepts);
router.post('/departments', authenticateToken, requireOrganizationContext, requireRole(['Admin']), createDept);
router.put('/departments/:id', authenticateToken, requireOrganizationContext, requireRole(['Admin']), updateDept);

export default router;
