const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'PROPERTY_CREATED',
      'PROPERTY_UPDATED',
      'PROPERTY_DELETED',
      'PROPERTY_SAVED',
      'PROPERTY_UNSAVED',
      'MESSAGE_SENT',
      'LEAD_CREATED',
      'LEAD_UPDATED',
      'VISIT_CREATED',
      'VISIT_UPDATED',
      'SUBSCRIPTION_CREATED',
      'SUBSCRIPTION_UPDATED',
      'BOOST_CREATED',
      'NOTIFICATION_CREATED'
    ]
  },
  entityType: {
    type: String,
    required: true,
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
