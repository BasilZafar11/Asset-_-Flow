import { Op } from 'sequelize';
import { Asset, Booking, TransferRequest, Allocation } from '../models/index.js';

export const getDashboardKPIs = async (req, res) => {
  const orgId = req.orgMember.organization_id;

  try {
    const today = new Date();

    const [
      availableCount,
      allocatedCount,
      maintenanceCount,
      bookingsCount,
      transfersCount,
      overdueCount,
      upcomingCount
    ] = await Promise.all([
      Asset.count({ where: { organization_id: orgId, status: 'Available' } }),
      Asset.count({ where: { organization_id: orgId, status: 'Allocated' } }),
      Asset.count({ where: { organization_id: orgId, status: 'Under Maintenance' } }),
      Booking.count({ where: { organization_id: orgId, status: { [Op.in]: ['Upcoming', 'Ongoing'] } } }),
      TransferRequest.count({ where: { organization_id: orgId, status: 'Pending' } }),
      Allocation.count({
        where: {
          organization_id: orgId,
          status: 'Active',
          expected_return_date: { [Op.lt]: today }
        }
      }),
      Allocation.count({
        where: {
          organization_id: orgId,
          status: 'Active',
          expected_return_date: { [Op.gte]: today }
        }
      })
    ]);

    return res.json({
      assets_available: availableCount,
      assets_allocated: allocatedCount,
      maintenance_today: maintenanceCount,
      active_bookings: bookingsCount,
      pending_transfers: transfersCount,
      overdue_returns: overdueCount,
      upcoming_returns: upcomingCount
    });
  } catch (err) {
    console.error('Error in getDashboardKPIs controller:', err);
    return res.status(500).json({ error: 'Internal server error compiling dashboard metrics.' });
  }
};
