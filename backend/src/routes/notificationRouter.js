import express from 'express';
import { listNotifications, readNotification } from '../controllers/notificationController.js';
import { authenticateToken, requireOrganizationContext } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/notifications', authenticateToken, requireOrganizationContext, listNotifications);
router.put('/notifications/:id/read', authenticateToken, requireOrganizationContext, readNotification);

export default router;
