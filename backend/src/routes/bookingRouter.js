import express from 'express';
import { listBookings, bookResource, cancelBooking } from '../controllers/bookingController.js';
import { authenticateToken, requireOrganizationContext } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/bookings', authenticateToken, requireOrganizationContext, listBookings);
router.post('/bookings', authenticateToken, requireOrganizationContext, bookResource);
router.put('/bookings/:id/cancel', authenticateToken, requireOrganizationContext, cancelBooking);

export default router;
