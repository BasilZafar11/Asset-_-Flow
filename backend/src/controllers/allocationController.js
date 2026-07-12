import { Op } from 'sequelize';
import { sequelize, Allocation, Asset, User, OrganizationMember, TransferRequest } from '../models/index.js';
import { logActivity } from '../utils/activityLogger.js';
import { createNotification } from '../utils/notificationHelper.js';

export const listAllocations = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const isManager = ['Asset Manager', 'Admin'].includes(req.orgMember.role) || req.orgMember.isOwner;

  try {
    const whereClause = { organization_id: orgId };
    if (!isManager) {
      whereClause.assigned_to_user_id = req.user.id;
    }

    const allocations = await Allocation.findAll({
      where: whereClause,
      include: [
        { model: Asset, as: 'Asset', attributes: ['tag', 'name'] },
        { model: User, as: 'User', attributes: ['id', 'name', 'email'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const parsed = allocations.map(al => {
      const isOverdue = al.status === 'Active' && al.expected_return_date && new Date(al.expected_return_date) < new Date();
      return {
        ...al.toJSON(),
        is_overdue: !!isOverdue
      };
    });

    return res.json(parsed);
  } catch (err) {
    console.error('Error listing allocations:', err);
    return res.status(500).json({ error: 'Internal server error listing allocations.' });
  }
};

export const allocateAsset = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const { asset_tag, assigned_to_user_id, expected_return_date, notes } = req.body;

  if (!asset_tag || !assigned_to_user_id) {
    return res.status(400).json({ error: 'Asset tag and assigned user ID are required.' });
  }

  const transaction = await sequelize.transaction();
  try {
    // 1. Verify user membership in org
    const member = await OrganizationMember.findOne({
      where: { user_id: assigned_to_user_id, organization_id: orgId, status: 'Active' },
      transaction
    });
    if (!member) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Selected user is not an active member of this workspace.' });
    }

    // 2. Verify asset existence
    const asset = await Asset.findOne({
      where: { tag: asset_tag, organization_id: orgId },
      transaction
    });
    if (!asset) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Asset not found in this workspace.' });
    }

    // 3. Conflict check
    if (asset.status === 'Allocated') {
      const currentHolder = await User.findByPk(asset.current_holder_id, { transaction });
      const holderName = currentHolder ? currentHolder.name : 'another employee';
      await transaction.rollback();
      return res.status(409).json({
        error: `Conflict: This asset is currently held by ${holderName}.`,
        message: `Currently held by ${holderName}. Use the Transfer Request workflow to transfer ownership.`,
        current_holder: holderName
      });
    }

    if (['Under Maintenance', 'Lost', 'Retired', 'Disposed'].includes(asset.status)) {
      await transaction.rollback();
      return res.status(400).json({ error: `This asset is unavailable because its status is: ${asset.status}.` });
    }

    // 4. Create allocation record
    await Allocation.create({
      organization_id: orgId,
      asset_tag,
      assigned_to_user_id,
      expected_return_date: expected_return_date || null,
      status: 'Active',
      notes: notes || null
    }, { transaction });

    // 5. Update Asset
    asset.status = 'Allocated';
    asset.current_holder_id = assigned_to_user_id;
    await asset.save({ transaction });

    await transaction.commit();

    await logActivity(orgId, req.user.id, 'ALLOCATE_ASSET', `Allocated asset ${asset_tag} to user ID: ${assigned_to_user_id}`);
    await createNotification(orgId, assigned_to_user_id, 'Asset Assigned', `Asset "${asset.name}" (${asset_tag}) has been allocated to you.`);

    return res.status(201).json({ message: 'Asset allocated successfully.' });
  } catch (err) {
    console.error('Error allocating asset:', err);
    return res.status(500).json({ error: 'Internal server error during asset allocation.' });
  }
};

export const returnAsset = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const allocationId = parseInt(req.params.id, 10);
  const { condition_notes } = req.body;

  if (isNaN(allocationId)) {
    return res.status(400).json({ error: 'Invalid allocation ID parameter.' });
  }

  const transaction = await sequelize.transaction();
  try {
    const allocation = await Allocation.findOne({
      where: { id: allocationId, organization_id: orgId, status: 'Active' },
      transaction
    });

    if (!allocation) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Active allocation record not found.' });
    }

    // Mark Allocation as Returned
    allocation.status = 'Returned';
    allocation.notes = condition_notes || 'Returned in good condition';
    await allocation.save({ transaction });

    // Revert Asset to Available & clear holder
    const asset = await Asset.findOne({
      where: { tag: allocation.asset_tag, organization_id: orgId },
      transaction
    });

    if (asset) {
      asset.status = 'Available';
      asset.current_holder_id = null;
      if (condition_notes) {
        asset.condition = condition_notes;
      }
      await asset.save({ transaction });
    }

    await transaction.commit();

    await logActivity(orgId, req.user.id, 'RETURN_ASSET', `Asset ${allocation.asset_tag} returned by user ID: ${allocation.assigned_to_user_id}`);
    await createNotification(orgId, allocation.assigned_to_user_id, 'Asset Return Logged', `Your return of asset ${allocation.asset_tag} has been processed.`);

    return res.json({ message: 'Asset return logged successfully.' });
  } catch (err) {
    console.error('Error returning asset:', err);
    return res.status(500).json({ error: 'Internal server error processing return.' });
  }
};

export const requestTransfer = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const { asset_tag, target_user_id } = req.body;

  if (!asset_tag || !target_user_id) {
    return res.status(400).json({ error: 'Asset tag and target user ID are required.' });
  }

  try {
    const asset = await Asset.findOne({
      where: { tag: asset_tag, organization_id: orgId }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    if (asset.status !== 'Allocated' || !asset.current_holder_id) {
      return res.status(400).json({ error: 'This asset is not currently allocated, hence cannot be transferred.' });
    }

    if (asset.current_holder_id === target_user_id) {
      return res.status(400).json({ error: 'The asset is already held by the target user.' });
    }

    const transfer = await TransferRequest.create({
      organization_id: orgId,
      asset_tag,
      requested_by_user_id: req.user.id,
      target_user_id,
      status: 'Pending'
    });

    await logActivity(orgId, req.user.id, 'REQUEST_TRANSFER', `Requested transfer of ${asset_tag} to user ID: ${target_user_id}`);

    // Notify managers
    const managers = await OrganizationMember.findAll({
      where: { organization_id: orgId, role: { [Op.in]: ['Asset Manager', 'Admin'] } }
    });
    for (const mgr of managers) {
      await createNotification(orgId, mgr.user_id, 'Transfer Request Raised', `Transfer request raised for asset ${asset.name} (${asset_tag}).`);
    }

    return res.status(201).json({
      message: 'Transfer request submitted successfully. Pending manager approval.',
      transfer_request_id: transfer.id
    });
  } catch (err) {
    console.error('Error raising transfer request:', err);
    return res.status(500).json({ error: 'Internal server error raising transfer request.' });
  }
};

export const listTransfers = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const isManager = ['Asset Manager', 'Admin'].includes(req.orgMember.role) || req.orgMember.isOwner;

  try {
    const whereClause = { organization_id: orgId };
    if (!isManager) {
      whereClause[Op.or] = [
        { requested_by_user_id: req.user.id },
        { target_user_id: req.user.id }
      ];
    }

    const transfers = await TransferRequest.findAll({
      where: whereClause,
      include: [
        { model: Asset, as: 'Asset', attributes: ['tag', 'name'] },
        { model: User, as: 'Requester', attributes: ['id', 'name'] },
        { model: User, as: 'TargetUser', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.json(transfers);
  } catch (err) {
    console.error('Error listing transfer requests:', err);
    return res.status(500).json({ error: 'Internal server error fetching transfers.' });
  }
};

export const approveTransfer = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const transferId = parseInt(req.params.id, 10);

  if (isNaN(transferId)) {
    return res.status(400).json({ error: 'Invalid transfer ID parameter.' });
  }

  const transaction = await sequelize.transaction();
  try {
    const request = await TransferRequest.findOne({
      where: { id: transferId, organization_id: orgId, status: 'Pending' },
      transaction
    });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Pending transfer request not found.' });
    }

    // 1. Resolve current active allocation
    const activeAlloc = await Allocation.findOne({
      where: { asset_tag: request.asset_tag, organization_id: orgId, status: 'Active' },
      transaction
    });

    if (activeAlloc) {
      activeAlloc.status = 'Returned';
      activeAlloc.notes = 'Transferred to target user via approved request';
      await activeAlloc.save({ transaction });
    }

    // 2. Create new active allocation
    await Allocation.create({
      organization_id: orgId,
      asset_tag: request.asset_tag,
      assigned_to_user_id: request.target_user_id,
      expected_return_date: null,
      status: 'Active',
      notes: 'Received via transfer'
    }, { transaction });

    // 3. Update asset holder details
    const asset = await Asset.findOne({
      where: { tag: request.asset_tag, organization_id: orgId },
      transaction
    });
    if (asset) {
      asset.current_holder_id = request.target_user_id;
      await asset.save({ transaction });
    }

    // 4. Update request status to Approved
    request.status = 'Approved';
    await request.save({ transaction });

    await transaction.commit();

    await logActivity(orgId, req.user.id, 'APPROVE_TRANSFER', `Approved transfer request ID: ${transferId} of ${request.asset_tag}`);
    await createNotification(orgId, request.requested_by_user_id, 'Transfer Approved', `Your transfer request for ${request.asset_tag} has been approved.`);
    await createNotification(orgId, request.target_user_id, 'Asset Transferred to You', `Asset ${request.asset_tag} is now allocated to you.`);

    return res.json({ message: 'Transfer request approved and asset re-allocated successfully.' });
  } catch (err) {
    console.error('Error approving transfer:', err);
    return res.status(500).json({ error: 'Internal server error approving transfer.' });
  }
};

export const rejectTransfer = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const transferId = parseInt(req.params.id, 10);

  if (isNaN(transferId)) {
    return res.status(400).json({ error: 'Invalid transfer ID parameter.' });
  }

  try {
    const request = await TransferRequest.findOne({
      where: { id: transferId, organization_id: orgId, status: 'Pending' }
    });

    if (!request) {
      return res.status(404).json({ error: 'Pending transfer request not found.' });
    }

    request.status = 'Rejected';
    await request.save();

    await logActivity(orgId, req.user.id, 'REJECT_TRANSFER', `Rejected transfer request ID: ${transferId}`);
    await createNotification(orgId, request.requested_by_user_id, 'Transfer Request Rejected', `Your transfer request for ${request.asset_tag} has been rejected.`);

    return res.json({ message: 'Transfer request rejected successfully.' });
  } catch (err) {
    console.error('Error rejecting transfer request:', err);
    return res.status(500).json({ error: 'Internal server error rejecting transfer.' });
  }
};
