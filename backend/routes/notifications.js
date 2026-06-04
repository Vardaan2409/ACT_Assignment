const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

// @desc Fetch all notifications for logged-in user
// @route GET /api/notifications
// @access Private
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving notifications' });
  }
});

// @desc Mark all notifications as read
// @route POST /api/notifications/read-all
// @access Private
router.post('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking notifications' });
  }
});

// @desc Get recent platform activity logs (Admin / Global)
// @route GET /api/notifications/activity-logs
// @access Private
router.get('/activity-logs', protect, async (req, res) => {
  try {
    const logs = await ActivityLog.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(30);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving platform activity logs' });
  }
});

module.exports = router;
