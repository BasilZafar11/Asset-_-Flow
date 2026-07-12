import { SystemActivityLog, User } from '../models/index.js';

export const listLogs = async (req, res) => {
  const orgId = req.orgMember.organization_id;

  try {
    const logs = await SystemActivityLog.findAll({
      where: { organization_id: orgId },
      include: [{ model: User, as: 'User', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']]
    });
    return res.json(logs);
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    return res.status(500).json({ error: 'Internal server error fetching logs.' });
  }
};
