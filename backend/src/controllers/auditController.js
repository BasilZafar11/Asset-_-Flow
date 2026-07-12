import { Op } from 'sequelize';
import { sequelize, AuditCycle, AuditItem, Asset, Department, User, OrganizationMember } from '../models/index.js';
import { logActivity } from '../utils/activityLogger.js';

export const listCycles = async (req, res) => {
  const orgId = req.orgMember.organization_id;

  try {
    const cycles = await AuditCycle.findAll({
      where: { organization_id: orgId },
      include: [{ model: Department, as: 'TargetDepartment', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']]
    });
    return res.json(cycles);
  } catch (err) {
    console.error('Error fetching audit cycles:', err);
    return res.status(500).json({ error: 'Internal server error fetching audits.' });
  }
};

export const getCycleDetails = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const cycleId = parseInt(req.params.id, 10);

  if (isNaN(cycleId)) {
    return res.status(400).json({ error: 'Invalid cycle ID parameter.' });
  }

  try {
    const cycle = await AuditCycle.findOne({
      where: { id: cycleId, organization_id: orgId },
      include: [{ model: Department, as: 'TargetDepartment', attributes: ['id', 'name'] }]
    });

    if (!cycle) {
      return res.status(404).json({ error: 'Audit cycle not found.' });
    }

    const items = await AuditItem.findAll({
      where: { audit_cycle_id: cycleId },
      include: [
        { model: Asset, as: 'Asset', attributes: ['tag', 'name'] },
        { model: User, as: 'VerifiedBy', attributes: ['id', 'name'] }
      ]
    });

    return res.json({
      ...cycle.toJSON(),
      items
    });
  } catch (err) {
    console.error('Error fetching audit cycle details:', err);
    return res.status(500).json({ error: 'Internal server error fetching details.' });
  }
};

export const createCycle = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const { name, target_department_id, start_date, end_date } = req.body;

  if (!name || !target_department_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'Name, target department ID, start date, and end date are required.' });
  }

  try {
    const dept = await Department.findOne({
      where: { id: target_department_id, organization_id: orgId }
    });
    if (!dept) {
      return res.status(400).json({ error: 'Target department not found in this organization.' });
    }

    const cycle = await AuditCycle.create({
      organization_id: orgId,
      name,
      target_department_id,
      start_date,
      end_date,
      status: 'Draft'
    });

    await logActivity(orgId, req.user.id, 'CREATE_AUDIT', `Created audit cycle: ${name} (ID: ${cycle.id})`);

    return res.status(201).json({
      message: 'Audit cycle created as Draft.',
      audit_cycle: cycle
    });
  } catch (err) {
    console.error('Error creating audit cycle:', err);
    return res.status(500).json({ error: 'Internal server error creating audit cycle.' });
  }
};

export const startCycle = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const cycleId = parseInt(req.params.id, 10);

  if (isNaN(cycleId)) {
    return res.status(400).json({ error: 'Invalid cycle ID parameter.' });
  }

  const transaction = await sequelize.transaction();
  try {
    const cycle = await AuditCycle.findOne({
      where: { id: cycleId, organization_id: orgId },
      transaction
    });

    if (!cycle) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Audit cycle not found.' });
    }

    if (cycle.status !== 'Draft') {
      await transaction.rollback();
      return res.status(400).json({ error: `Cannot start a cycle that is already in ${cycle.status} status.` });
    }

    cycle.status = 'Active';
    await cycle.save({ transaction });

    // Populate Audit Items: target all assets allocated to users of the target department
    const members = await OrganizationMember.findAll({
      where: { department_id: cycle.target_department_id, organization_id: orgId },
      attributes: ['user_id'],
      transaction
    });

    const memberUserIds = members.map(m => m.user_id);

    if (memberUserIds.length > 0) {
      const assets = await Asset.findAll({
        where: {
          organization_id: orgId,
          current_holder_id: { [Op.in]: memberUserIds }
        },
        transaction
      });

      const auditItemsToCreate = assets.map(a => ({
        audit_cycle_id: cycleId,
        asset_tag: a.tag,
        verification_status: 'Pending'
      }));

      if (auditItemsToCreate.length > 0) {
        await AuditItem.bulkCreate(auditItemsToCreate, { transaction });
      }
    }

    await transaction.commit();

    await logActivity(orgId, req.user.id, 'START_AUDIT', `Activated audit cycle ID: ${cycleId}`);

    return res.json({ message: 'Audit cycle activated. Verification items generated successfully.' });
  } catch (err) {
    console.error('Error starting audit cycle:', err);
    return res.status(500).json({ error: 'Internal server error activating audit cycle.' });
  }
};

export const updateItem = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const cycleId = parseInt(req.params.id, 10);
  const itemId = parseInt(req.params.itemId, 10);
  const { verification_status, notes } = req.body;

  if (isNaN(cycleId) || isNaN(itemId)) {
    return res.status(400).json({ error: 'Invalid parameters.' });
  }

  const validStatuses = ['Pending', 'Verified', 'Missing', 'Damaged'];
  if (!validStatuses.includes(verification_status)) {
    return res.status(400).json({ error: `Invalid verification status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const cycle = await AuditCycle.findOne({
      where: { id: cycleId, organization_id: orgId }
    });

    if (!cycle) {
      return res.status(404).json({ error: 'Audit cycle not found.' });
    }

    if (cycle.status !== 'Active') {
      return res.status(400).json({ error: 'Cannot log verifications. Cycle is not currently Active.' });
    }

    const item = await AuditItem.findOne({
      where: { id: itemId, audit_cycle_id: cycleId }
    });

    if (!item) {
      return res.status(404).json({ error: 'Audit verification item not found in this cycle.' });
    }

    item.verification_status = verification_status;
    item.notes = notes || null;
    item.verified_by_user_id = req.user.id;
    await item.save();

    return res.json({ message: 'Audit item verification details updated.', item });
  } catch (err) {
    console.error('Error updating audit item:', err);
    return res.status(500).json({ error: 'Internal server error updating verification.' });
  }
};

export const completeCycle = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const cycleId = parseInt(req.params.id, 10);

  if (isNaN(cycleId)) {
    return res.status(400).json({ error: 'Invalid cycle ID parameter.' });
  }

  const transaction = await sequelize.transaction();
  try {
    const cycle = await AuditCycle.findOne({
      where: { id: cycleId, organization_id: orgId },
      transaction
    });

    if (!cycle) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Audit cycle not found.' });
    }

    if (cycle.status !== 'Active') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Only Active audit cycles can be completed.' });
    }

    cycle.status = 'Completed';
    await cycle.save({ transaction });

    // Propagate changes to assets
    const items = await AuditItem.findAll({
      where: { audit_cycle_id: cycleId },
      transaction
    });

    for (const item of items) {
      if (item.verification_status === 'Missing') {
        await Asset.update(
          { status: 'Lost' },
          { where: { tag: item.asset_tag, organization_id: orgId }, transaction }
        );
      } else if (item.verification_status === 'Damaged') {
        await Asset.update(
          { status: 'Under Maintenance' },
          { where: { tag: item.asset_tag, organization_id: orgId }, transaction }
        );
      }
    }

    await transaction.commit();

    await logActivity(orgId, req.user.id, 'COMPLETE_AUDIT', `Closed audit cycle ID: ${cycleId}`);

    return res.json({ message: 'Audit cycle completed. Discrepancy assets updated successfully.' });
  } catch (err) {
    console.error('Error completing audit cycle:', err);
    return res.status(500).json({ error: 'Internal server error completing audit cycle.' });
  }
};
