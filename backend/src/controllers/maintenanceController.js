import { sequelize, MaintenanceRequest, Asset, User, OrganizationMember } from '../models/index.js';
import { logActivity } from '../utils/activityLogger.js';
import { createNotification } from '../utils/notificationHelper.js';

export const listRequests = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const isManager = ['Asset Manager', 'Admin'].includes(req.orgMember.role) || req.orgMember.isOwner;

  try {
    const whereClause = { organization_id: orgId };
    if (!isManager) {
      whereClause.raised_by_user_id = req.user.id;
    }

    const requests = await MaintenanceRequest.findAll({
      where: whereClause,
      include: [
        { model: Asset, as: 'Asset', attributes: ['tag', 'name', 'status'] },
        { model: User, as: 'RaisedBy', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.json(requests);
  } catch (err) {
    console.error('Error fetching maintenance requests:', err);
    return res.status(500).json({ error: 'Internal server error fetching requests.' });
  }
};

export const raiseRequest = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const { asset_tag, issue_description, priority, photo_url } = req.body;

  if (!asset_tag || !issue_description) {
    return res.status(400).json({ error: 'Asset tag and issue description are required.' });
  }

  const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
  const reqPriority = priority || 'Medium';
  if (!validPriorities.includes(reqPriority)) {
    return res.status(400).json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` });
  }

  try {
    const asset = await Asset.findOne({
      where: { tag: asset_tag, organization_id: orgId }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found in this workspace.' });
    }

    const request = await MaintenanceRequest.create({
      organization_id: orgId,
      asset_tag,
      raised_by_user_id: req.user.id,
      issue_description,
      priority: reqPriority,
      status: 'Pending',
      photo_url: photo_url || null
    });

    await logActivity(orgId, req.user.id, 'RAISE_MAINTENANCE', `Raised maintenance request ID: ${request.id} for ${asset_tag}`);

    // Notify managers
    const managers = await OrganizationMember.findAll({
      where: { organization_id: orgId, role: ['Asset Manager', 'Admin'] }
    });
    for (const mgr of managers) {
      await createNotification(orgId, mgr.user_id, 'New Maintenance Request', `Maintenance request raised for "${asset.name}" (${asset_tag}).`);
    }

    return res.status(201).json({
      message: 'Maintenance request raised successfully.',
      maintenance_request: request
    });
  } catch (err) {
    console.error('Error raising maintenance request:', err);
    return res.status(500).json({ error: 'Internal server error raising maintenance request.' });
  }
};

export const updateStatus = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const requestId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (isNaN(requestId)) {
    return res.status(400).json({ error: 'Invalid request ID parameter.' });
  }

  const validStatuses = ['Pending', 'Approved', 'Rejected', 'In Progress', 'Resolved'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const transaction = await sequelize.transaction();
  try {
    const request = await MaintenanceRequest.findOne({
      where: { id: requestId, organization_id: orgId },
      transaction
    });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Maintenance request not found.' });
    }

    request.status = status;
    await request.save({ transaction });

    // Side effects on associated Asset based on status transition
    if (status === 'Approved') {
      const asset = await Asset.findOne({ where: { tag: request.asset_tag, organization_id: orgId }, transaction });
      if (asset) {
        asset.status = 'Under Maintenance';
        await asset.save({ transaction });
      }
    } else if (status === 'Resolved') {
      const asset = await Asset.findOne({ where: { tag: request.asset_tag, organization_id: orgId }, transaction });
      if (asset) {
        asset.status = 'Available';
        asset.current_holder_id = null;
        await asset.save({ transaction });
      }
    }

    await transaction.commit();

    await logActivity(orgId, req.user.id, 'UPDATE_MAINTENANCE_STATUS', `Updated maintenance request ${requestId} status to ${status}`);
    await createNotification(
      orgId,
      request.raised_by_user_id,
      'Maintenance Status Updated',
      `Your maintenance request for ${request.asset_tag} has been updated to: ${status}.`
    );

    return res.json({
      message: `Maintenance request status updated to ${status} successfully.`,
      maintenance_request: request
    });
  } catch (err) {
    console.error('Error updating maintenance status:', err);
    return res.status(500).json({ error: 'Internal server error updating status.' });
  }
};
