import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Activity, Home, CreditCard, Zap, User, Calendar } from 'lucide-react';
import { useNotifications, useMarkAllRead } from '../utils/useQueryHooks';
import { useAuth } from '../context/AuthContext';
import { useSyncStatus } from '../context/SyncContext';

const iconForNotif = (title = '') => {
  if (title.includes('Property'))    return <Home className="w-4 h-4 text-indigo-500" />;
  if (title.includes('Subscription') || title.includes('Plan')) return <CreditCard className="w-4 h-4 text-emerald-500" />;
  if (title.includes('Boost'))       return <Zap className="w-4 h-4 text-amber-500" />;
  if (title.includes('Lead'))        return <Activity className="w-4 h-4 text-rose-500" />;
  if (title.includes('Visit'))       return <Calendar className="w-4 h-4 text-sky-500" />;
  return <Bell className="w-4 h-4 text-slate-500" />;
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const NotificationBell = () => {
  const { user } = useAuth();
  const { isConnected } = useSyncStatus();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const { data: notifications = [] } = useNotifications(user?.token);
  const markAllRead = useMarkAllRead(user?.token);

  const unread = notifications.filter(n => !n.isRead).length;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      {/* Sync Status + Bell Button */}
      <div className="flex items-center space-x-2">
        {/* Live Sync Indicator */}
        <div
          className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100"
          title={isConnected ? 'Real-time sync active' : 'Connecting to live sync…'}
        >
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-ping'
          }`} />
          <span className={`text-[10px] font-black uppercase tracking-wider hidden sm:block ${
            isConnected ? 'text-emerald-600' : 'text-amber-600'
          }`}>
            {isConnected ? 'Live' : 'Syncing…'}
          </span>
        </div>

        {/* Bell */}
        <button
          id="notification-bell-btn"
          onClick={() => setOpen(v => !v)}
          className="relative p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
        >
          <Bell className="w-5 h-5 text-slate-600" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm animate-bounce">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>

      {/* Notification Panel */}
      {open && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 z-[9999] overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-sm">Notifications</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                {unread > 0 ? `${unread} unread` : 'All caught up!'}
              </p>
            </div>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">No notifications yet</p>
                <p className="text-xs text-slate-300 mt-1">Actions across the platform will appear here</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((notif) => (
                <div
                  key={notif._id}
                  className={`px-4 py-3 flex items-start space-x-3 transition-colors ${
                    notif.isRead ? 'bg-white' : 'bg-indigo-50/40'
                  }`}
                >
                  <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                    notif.isRead ? 'bg-slate-100' : 'bg-white shadow-sm'
                  }`}>
                    {iconForNotif(notif.title)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold leading-snug ${notif.isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-slate-300 font-semibold mt-1">
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/50">
              <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">
                Showing last {Math.min(notifications.length, 20)} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
