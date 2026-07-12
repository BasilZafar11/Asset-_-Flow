import { Notification } from '../models/index.js';

export const listNotifications = async (req, res) => {
  const orgId = req.orgMember.organization_id;

  try {
    const notifications = await Notification.findAll({
      where: { organization_id: orgId, user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    return res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ error: 'Internal server error fetching notifications.' });
  }
};

export const readNotification = async (req, res) => {
  const orgId = req.orgMember.organization_id;
  const notifId = parseInt(req.params.id, 10);

  if (isNaN(notifId)) {
    return res.status(400).json({ error: 'Invalid notification ID parameter.' });
  }

  try {
    const notification = await Notification.findOne({
      where: { id: notifId, organization_id: orgId, user_id: req.user.id }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found or access denied.' });
    }

    notification.is_read = true;
    await notification.save();

    return res.json({ message: 'Notification marked as read.', notification });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return res.status(500).json({ error: 'Internal server error processing notification.' });
  }
};
