import { store } from './store.service.js';
import { pool } from '../config/database.js';

class NotificationService {
  /**
   * Dispatch a new persistent notification in MySQL.
   */
  async notify({
    recipient_role,
    recipient_id = null,
    title,
    message,
    type = 'INFO',
    problem_id = null,
    metadata = {},
  }) {
    return store.createNotification({
      recipient_role,
      recipient_id,
      title,
      message,
      type,
      problem_id,
      metadata,
    });
  }

  /**
   * Retrieve notifications matching role and/or specific user ID from MySQL.
   */
  async getForUser({ role, user_id, unread_only = false }) {
    return store.getNotifications({ role, user_id, unread_only });
  }

  /**
   * Mark a notification as read in MySQL.
   */
  async markRead(notificationId) {
    return store.markNotificationRead(notificationId);
  }

  async reset() {
    await pool.query('DELETE FROM notifications;');
  }
}

export const notificationService = new NotificationService();
