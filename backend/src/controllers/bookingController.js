import { Op } from 'sequelize';
import { Booking, Asset, User } from '../models/index.js';
import { logActivity } from '../utils/activityLogger.js';
import { createNotification } from '../utils/notificationHelper.js';

export const listBookings = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const { asset_tag, start_date, end_date } = req.query;

  try {
    const whereClause = {
      organization_id: orgId,
      status: { [Op.ne]: 'Cancelled' }
    };

    if (asset_tag) {
      whereClause.asset_tag = asset_tag;
    }

    if (start_date && end_date) {
      whereClause.start_time = { [Op.gte]: new Date(`${start_date}T00:00:00Z`) };
      whereClause.end_time = { [Op.lte]: new Date(`${end_date}T23:59:59Z`) };
    }

    const bookings = await Booking.findAll({
      where: whereClause,
      include: [
        { model: Asset, as: 'Asset', attributes: ['tag', 'name'] },
        { model: User, as: 'BookedBy', attributes: ['id', 'name', 'email'] }
      ],
      order: [['start_time', 'ASC']]
    });

    return res.json(bookings);
  } catch (err) {
    console.error('Error listing bookings:', err);
    return res.status(500).json({ error: 'Internal server error listing bookings.' });
  }
};

export const bookResource = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const { asset_tag, start_time, end_time } = req.body;

  if (!asset_tag || !start_time || !end_time) {
    return res.status(400).json({ error: 'Asset tag, start time, and end time are required.' });
  }

  const start = new Date(start_time);
  const end = new Date(end_time);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid start_time or end_time date format.' });
  }

  if (start >= end) {
    return res.status(400).json({ error: 'Start time must be before end time.' });
  }

  try {
    // 1. Verify resource bookability
    const asset = await Asset.findOne({
      where: { tag: asset_tag, organization_id: orgId }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found in this workspace.' });
    }

    if (!asset.is_shared_resource) {
      return res.status(400).json({ error: 'This asset is not registered as a bookable shared resource.' });
    }

    if (['Lost', 'Retired', 'Disposed'].includes(asset.status)) {
      return res.status(400).json({ error: `Cannot book resource. Current status: ${asset.status}` });
    }

    // 2. Overlap validation
    // Overlaps if: existing_start < new_end AND existing_end > new_start
    const overlap = await Booking.findOne({
      where: {
        asset_tag,
        organization_id: orgId,
        status: { [Op.in]: ['Upcoming', 'Ongoing'] },
        start_time: { [Op.lt]: end },
        end_time: { [Op.gt]: start }
      },
      include: [{ model: User, as: 'BookedBy', attributes: ['name'] }]
    });

    if (overlap) {
      const conflictName = overlap.BookedBy ? overlap.BookedBy.name : 'another member';
      return res.status(409).json({
        error: 'Overlap conflict: This time slot is already reserved.',
        message: `This resource is already booked by ${conflictName} from ${overlap.start_time} to ${overlap.end_time}.`
      });
    }

    // 3. Create Booking
    const booking = await Booking.create({
      organization_id: orgId,
      asset_tag,
      booked_by_user_id: req.user.id,
      start_time: start,
      end_time: end,
      status: 'Upcoming'
    });

    await logActivity(orgId, req.user.id, 'CREATE_BOOKING', `Booked shared resource ${asset_tag} from ${start_time} to ${end_time}`);
    await createNotification(orgId, req.user.id, 'Booking Confirmed', `Your booking for "${asset.name}" (${asset_tag}) is confirmed.`);

    return res.status(201).json({
      message: 'Booking created successfully.',
      booking
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    return res.status(500).json({ error: 'Internal server error creating booking.' });
  }
};

export const cancelBooking = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const bookingId = parseInt(req.params.id, 10);

  if (isNaN(bookingId)) {
    return res.status(400).json({ error: 'Invalid booking ID parameter.' });
  }

  try {
    const booking = await Booking.findOne({
      where: { id: bookingId, organization_id: orgId }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const isManager = ['Asset Manager', 'Admin'].includes(req.orgMember.role) || req.orgMember.isOwner;
    if (booking.booked_by_user_id !== req.user.id && !isManager) {
      return res.status(403).json({ error: 'Forbidden: You cannot cancel another user\'s booking.' });
    }

    if (['Cancelled', 'Completed'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot cancel a booking that is already ${booking.status}.` });
    }

    booking.status = 'Cancelled';
    await booking.save();

    await logActivity(orgId, req.user.id, 'CANCEL_BOOKING', `Cancelled booking ID: ${bookingId} for asset: ${booking.asset_tag}`);
    await createNotification(orgId, booking.booked_by_user_id, 'Booking Cancelled', `Your booking for asset ${booking.asset_tag} has been cancelled.`);

    return res.json({ message: 'Booking cancelled successfully.', booking });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    return res.status(500).json({ error: 'Internal server error cancelling booking.' });
  }
};
