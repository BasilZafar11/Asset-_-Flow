import { Department, OrganizationMember, User } from '../models/index.js';
import { logActivity } from '../utils/activityLogger.js';
import { createNotification } from '../utils/notificationHelper.js';

export const listDepts = async (req, res) => {
  const orgId = req.orgMember.organization_id;

  try {
    const depts = await Department.findAll({
      where: { organization_id: orgId },
      include: [
        { model: Department, as: 'ParentDepartment', attributes: ['id', 'name'] },
        { model: User, as: 'HeadUser', attributes: ['id', 'name', 'email'] }
      ]
    });
    return res.json(depts);
  } catch (err) {
    console.error('Error fetching departments:', err);
    return res.status(500).json({ error: 'Internal server error fetching departments.' });
  }
};

export const createDept = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const { name, parent_id, head_user_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Department name is required.' });
  }

  try {
    if (parent_id) {
      const parent = await Department.findOne({
        where: { id: parent_id, organization_id: orgId }
      });
      if (!parent) {
        return res.status(400).json({ error: 'Parent department not found in this organization.' });
      }
    }

    if (head_user_id) {
      const headMember = await OrganizationMember.findOne({
        where: { user_id: head_user_id, organization_id: orgId, status: 'Active' }
      });
      if (!headMember) {
        return res.status(400).json({ error: 'Assigned department head is not an active member of this organization.' });
      }
    }

    const dept = await Department.create({
      organization_id: orgId,
      name,
      parent_id: parent_id || null,
      head_user_id: head_user_id || null,
      status: 'Active'
    });

    await logActivity(orgId, req.user.id, 'CREATE_DEPT', `Created department: ${name} (ID: ${dept.id})`);

    if (head_user_id) {
      await createNotification(orgId, head_user_id, 'Department Assigned', `You have been appointed as the Head of department: ${name}.`);
      
      const headMember = await OrganizationMember.findOne({
        where: { user_id: head_user_id, organization_id: orgId }
      });
      if (headMember && headMember.role === 'Employee') {
        headMember.role = 'Department Head';
        await headMember.save();
      }
    }

    return res.status(201).json({ message: 'Department created successfully.', department: dept });
  } catch (err) {
    console.error('Error creating department:', err);
    return res.status(500).json({ error: 'Internal server error creating department.' });
  }
};

export const updateDept = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const deptId = parseInt(req.params.id, 10);
  const { name, parent_id, head_user_id, status } = req.body;

  if (isNaN(deptId)) {
    return res.status(400).json({ error: 'Invalid department ID parameter.' });
  }

  try {
    const dept = await Department.findOne({
      where: { id: deptId, organization_id: orgId }
    });

    if (!dept) {
      return res.status(404).json({ error: 'Department not found in this organization.' });
    }

    if (parent_id) {
      if (parent_id === deptId) {
        return res.status(400).json({ error: 'A department cannot be its own parent.' });
      }
      const parent = await Department.findOne({
        where: { id: parent_id, organization_id: orgId }
      });
      if (!parent) {
        return res.status(400).json({ error: 'Parent department not found in this organization.' });
      }
    }

    if (head_user_id) {
      const headMember = await OrganizationMember.findOne({
        where: { user_id: head_user_id, organization_id: orgId, status: 'Active' }
      });
      if (!headMember) {
        return res.status(400).json({ error: 'Assigned department head is not an active member of this organization.' });
      }
    }

    const previousHeadId = dept.head_user_id;

    if (name !== undefined) dept.name = name;
    if (parent_id !== undefined) dept.parent_id = parent_id;
    if (head_user_id !== undefined) dept.head_user_id = head_user_id;
    if (status !== undefined) dept.status = status;

    await dept.save();

    await logActivity(orgId, req.user.id, 'UPDATE_DEPT', `Updated department: ${dept.name} (ID: ${deptId})`);

    if (head_user_id && head_user_id !== previousHeadId) {
      await createNotification(orgId, head_user_id, 'Department Head Assigned', `You have been appointed as the Head of department: ${dept.name}.`);
      
      const headMember = await OrganizationMember.findOne({
        where: { user_id: head_user_id, organization_id: orgId }
      });
      if (headMember && headMember.role === 'Employee') {
        headMember.role = 'Department Head';
        await headMember.save();
      }
    }

    return res.json({ message: 'Department updated successfully.', department: dept });
  } catch (err) {
    console.error('Error updating department:', err);
    return res.status(500).json({ error: 'Internal server error updating department.' });
  }
};
