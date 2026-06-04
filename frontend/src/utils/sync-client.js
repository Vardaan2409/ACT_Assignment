/**
 * Live Sync Client
 * Establishes a persistent WebSocket connection to the backend event hub.
 * On every server-emitted event, the correct TanStack Query cache key is
 * invalidated — triggering automatic background refetches across every
 * component that subscribes to that data.
 *
 * Also bridges Pusher channel events when PUSHER_KEY is provided.
 */

import { queryClient } from '../main';

// Map from server event action → list of query keys to invalidate
const QUERY_INVALIDATION_MAP = {
  PROPERTY_CREATED:      [['properties'], ['dashboard'], ['activityLogs']],
  PROPERTY_UPDATED:      [['properties'], ['dashboard'], ['activityLogs']],
  PROPERTY_DELETED:      [['properties'], ['dashboard'], ['activityLogs']],
  PROPERTY_SAVED:        [['properties'], ['dashboard']],
  PROPERTY_UNSAVED:      [['properties'], ['dashboard']],
  LEAD_CREATED:          [['dashboard'], ['activityLogs'], ['notifications']],
  LEAD_UPDATED:          [['dashboard'], ['activityLogs']],
  VISIT_CREATED:         [['dashboard'], ['activityLogs'], ['notifications']],
  VISIT_UPDATED:         [['dashboard'], ['activityLogs']],
  SUBSCRIPTION_CREATED:  [['billing'], ['analytics'], ['activityLogs'], ['notifications']],
  SUBSCRIPTION_UPDATED:  [['billing'], ['analytics'], ['activityLogs']],
  BOOST_CREATED:         [['properties'], ['boosts'], ['analytics'], ['activityLogs'], ['notifications']],
  NOTIFICATION_CREATED:  [['notifications']],
  MESSAGE_SENT:          [['dashboard'], ['notifications']],
};

let ws = null;
let reconnectTimer = null;
let isIntentionallyClosed = false;

function getWsUrl() {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return base.replace(/^http/, 'ws').replace(/^https/, 'wss');
}

function handleServerEvent(payload) {
  const { action } = payload;
  const queryKeys = QUERY_INVALIDATION_MAP[action];
  if (!queryKeys) return;

  console.log(`🔄 Sync: Invalidating ${queryKeys.length} cache key(s) for action: ${action}`);
  queryKeys.forEach(key => {
    queryClient.invalidateQueries({ queryKey: key });
  });
}

function connect(token) {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  const url = getWsUrl();
  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log('🔌 Live Sync WebSocket connected');
    // Authenticate connection
    if (token) {
      ws.send(JSON.stringify({ type: 'AUTH', token }));
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'SYNC_EVENT') {
        handleServerEvent(data.payload);
      }

      if (data.type === 'NOTIFICATION_CREATED') {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }

      if (data.type === 'CONNECTION_ACK') {
        console.log('✅ Live Sync Hub:', data.message);
      }
    } catch (e) {
      // Ignore malformed messages
    }
  };

  ws.onclose = () => {
    console.log('🔌 Live Sync WebSocket disconnected');
    if (!isIntentionallyClosed) {
      // Auto-reconnect after 3 seconds
      reconnectTimer = setTimeout(() => connect(token), 3000);
    }
  };

  ws.onerror = (err) => {
    console.warn('⚠️ Live Sync WebSocket error — will retry in 3s');
    ws.close();
  };
}

function disconnect() {
  isIntentionallyClosed = true;
  clearTimeout(reconnectTimer);
  if (ws) {
    ws.close();
    ws = null;
  }
}

// Pusher bridge (when VITE_PUSHER_KEY is available)
let pusherClient = null;

async function connectPusher() {
  const pusherKey = import.meta.env.VITE_PUSHER_KEY;
  const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER || 'mt1';

  if (!pusherKey) return;

  const PusherModule = await import('pusher-js');
  const Pusher = PusherModule.default;

  pusherClient = new Pusher(pusherKey, { cluster: pusherCluster });
  const channel = pusherClient.subscribe('urban-homely-sync');

  channel.bind('global-mutation', (payload) => {
    console.log(`📡 Pusher event received: ${payload.action}`);
    handleServerEvent(payload);
  });

  console.log('✅ Pusher bridge connected to urban-homely-sync channel');
}

/**
 * Start the synchronization bridge.
 * Call this once after user logs in.
 */
export function startSync(token) {
  isIntentionallyClosed = false;
  connect(token);
  connectPusher();
}

/**
 * Stop the synchronization bridge.
 * Call on logout.
 */
export function stopSync() {
  disconnect();
  if (pusherClient) {
    pusherClient.unsubscribe('urban-homely-sync');
    pusherClient.disconnect();
    pusherClient = null;
  }
}

/**
 * Manually publish a cache invalidation for optimistic updates
 * from any part of the app without waiting for server event.
 */
export function invalidate(...queryKeys) {
  queryKeys.forEach(key => {
    queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
  });
}
