import express from 'express';
import { createOrg, listOrgs, inviteMember, listMembers, updateMember } from '../controllers/orgController.js';
import { authenticateToken, requireOrganizationContext, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/organizations', authenticateToken, createOrg);
router.get('/organizations', authenticateToken, listOrgs);
router.post('/organizations/:id/invite', authenticateToken, requireOrganizationContext, requireRole(['Admin']), inviteMember);
router.get('/organizations/:id/members', authenticateToken, requireOrganizationContext, requireRole(['Admin']), listMembers);
router.put('/organizations/:id/members/:userId', authenticateToken, requireOrganizationContext, requireRole(['Admin']), updateMember);

export default router;
