const EventEmitter = require('events');
const Pusher = require('pusher');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const User = require('../models/User');

class CentralEventBus extends EventEmitter {
  constructor() {
    super();
    this.wsServer = null;

    // Initialize Pusher if variables exist
    const pusherAppId = process.env.PUSHER_APP_ID;
    const pusherKey = process.env.PUSHER_KEY;
    const pusherSecret = process.env.PUSHER_SECRET;
    const pusherCluster = process.env.PUSHER_CLUSTER || 'mt1';

    if (pusherAppId && pusherKey && pusherSecret) {
      this.pusher = new Pusher({
        appId: pusherAppId,
        key: pusherKey,
        secret: pusherSecret,
        cluster: pusherCluster,
        useTLS: true,
      });
      console.log('✅ Real-time Pusher client initialized successfully');
    } else {
      this.pusher = null;
      console.log('💡 Pusher credentials not provided. Using direct WebSocket Broadcast mode');
    }
  }

  setWebSocketServer(wss) {
    this.wsServer = wss;
  }

  /**
   * Dispatches and logs any platform mutation action.
   * Updates DB logs, creates relevant notifications, and broadcasts real-time updates.
   * 
   * @param {Object} param0
   * @param {string} param0.action - Action enum (e.g. 'PROPERTY_CREATED')
   * @param {string} param0.userId - Actor ID
   * @param {string} param0.entityType - Target model type
   * @param {string} param0.entityId - Target model ID
   * @param {string} param0.description - Readable log string
   * @param {Object} [param0.metadata] - Extra context info
   */
  async publish({ action, userId, entityType, entityId, description, metadata = {} }) {
    try {
      // 1. Persist Activity Log
      const log = await ActivityLog.create({
        user: userId,
        action,
        entityType,
        entityId,
        description,
        metadata
      });

      // 2. Generate Notifications if needed
      await this.generateNotifications(action, userId, entityType, entityId, description);

      // 3. Broadcast Event to active connections
      const payload = {
        action,
        userId,
        entityType,
        entityId,
        description,
        metadata,
        timestamp: new Date()
      };

      // Direct WebSockets Broadcast
      if (this.wsServer) {
        const messageString = JSON.stringify({ type: 'SYNC_EVENT', payload });
        this.wsServer.clients.forEach(client => {
          if (client.readyState === 1) { // OPEN
            client.send(messageString);
          }
        });
      }

      // Pusher Broadcast
      if (this.pusher) {
        this.pusher.trigger('urban-homely-sync', 'global-mutation', payload).catch(err => {
          console.error('Pusher trigger error:', err.message);
        });
      }

      // Local node process event emitting
      this.emit(action, payload);
      this.emit('MUTATION', payload);

      console.log(`📡 Broadcasted Event: ${action} - ${description}`);
    } catch (err) {
      console.error('Error publishing event to bus:', err.message);
    }
  }

  /**
   * Helper to automatically spawn notifications depending on action type
   */
  async generateNotifications(action, actorId, entityType, entityId, description) {
    try {
      const actor = await User.findById(actorId).select('name');
      const actorName = actor ? actor.name : 'A user';

      let notificationData = null;

      // Handle custom recipient logic
      if (action === 'PROPERTY_CREATED') {
        // Notify all other users about new property listing
        const users = await User.find({ _id: { $ne: actorId } }).select('_id');
        const notifications = users.map(u => ({
          recipient: u._id,
          title: 'New Property Published 🏠',
          message: `${actorName} published a new property: ${description}`,
          actionUrl: `/explore`
        }));
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      } 
      else if (action === 'LEAD_CREATED') {
        // Notify actor & admins/owners
        const users = await User.find({}).select('_id');
        const notifications = users.map(u => ({
          recipient: u._id,
          title: 'New Lead Generated 📈',
          message: `A new sales lead was created: ${description}`,
          actionUrl: `/dashboard`
        }));
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      }
      else if (action === 'VISIT_CREATED') {
        // Notify admins/team
        const users = await User.find({}).select('_id');
        const notifications = users.map(u => ({
          recipient: u._id,
          title: 'Visit Scheduled 📅',
          message: `${actorName} scheduled a property visit: ${description}`,
          actionUrl: `/dashboard`
        }));
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      }
      else if (action === 'SUBSCRIPTION_CREATED' || action === 'SUBSCRIPTION_UPDATED') {
        // Notify actor
        await Notification.create({
          recipient: actorId,
          title: 'Subscription Activated 🚀',
          message: `Your membership was successfully updated: ${description}`,
          actionUrl: `/dashboard`
        });
      }
      else if (action === 'BOOST_CREATED') {
        // Notify actor
        await Notification.create({
          recipient: actorId,
          title: 'Listing Boosted ⚡',
          message: `Your property booster is active: ${description}`,
          actionUrl: `/dashboard`
        });
      }

      // If we added notification logs, notify socket connections to refresh their unread lists
      if (this.wsServer) {
        this.wsServer.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({ type: 'NOTIFICATION_CREATED' }));
          }
        });
      }
    } catch (err) {
      console.error('Error generating notification log:', err.message);
    }
  }
}

const eventBus = new CentralEventBus();
module.exports = eventBus;
