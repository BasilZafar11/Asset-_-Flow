import express from 'express';
import { listCategories, createCategory } from '../controllers/categoryController.js';
import { authenticateToken, requireOrganizationContext, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/categories', authenticateToken, requireOrganizationContext, listCategories);
router.post('/categories', authenticateToken, requireOrganizationContext, requireRole(['Admin']), createCategory);

export default router;
