import express from 'express';
import { listAllocations, allocateAsset, returnAsset, requestTransfer, listTransfers, approveTransfer, rejectTransfer } from '../controllers/allocationController.js';
import { authenticateToken, requireOrganizationContext, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/allocations', authenticateToken, requireOrganizationContext, listAllocations);
router.post('/allocations', authenticateToken, requireOrganizationContext, requireRole(['Asset Manager', 'Admin']), allocateAsset);
router.post('/allocations/:id/return', authenticateToken, requireOrganizationContext, requireRole(['Asset Manager', 'Admin']), returnAsset);

router.post('/allocations/transfer', authenticateToken, requireOrganizationContext, requestTransfer);
router.get('/allocations/transfers', authenticateToken, requireOrganizationContext, listTransfers);
router.post('/allocations/transfers/:id/approve', authenticateToken, requireOrganizationContext, requireRole(['Asset Manager', 'Admin']), approveTransfer);
router.post('/allocations/transfers/:id/reject', authenticateToken, requireOrganizationContext, requireRole(['Asset Manager', 'Admin']), rejectTransfer);

export default router;
