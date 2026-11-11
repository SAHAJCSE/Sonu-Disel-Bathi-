import React, { useState } from 'react';
import { LiveNotification } from '../types.ts';
import { X, Bell } from 'lucide-react';

interface LiveNotificationCenterProps {
  notifications: LiveNotification[];
  unreadCount: number;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: number) => void;
  onSelectOrder?: (orderNumber: string) => void;
  userRole?: string;
}

export const LiveNotificationCenter: React.FC<LiveNotificationCenterProps> = ({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onSelectOrder,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="px-2.5 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
      >
        <Bell className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Alerts</span>
        {unreadCount > 0 && (
          <span className="px-1.5 py-0.2 rounded bg-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 text-white font-mono text-[10px]">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-x-3 top-14 sm:absolute sm:inset-auto sm:right-0 sm:top-10 z-50 w-auto sm:w-80 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-lg overflow-hidden transition-colors">
            <div className="px-3.5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
              <span className="text-xs font-bold uppercase tracking-tight">Notifications</span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="text-[10px] font-bold text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-200 underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-[11px] font-medium text-zinc-500">
                  No notifications.
                </div>
              ) : (
                notifications.slice(0, 15).map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.isRead) onMarkRead(notif.id);
                      if (notif.referenceId && onSelectOrder) {
                        onSelectOrder(notif.referenceId);
                        setIsOpen(false);
                      }
                    }}
                    className={`p-3 relative group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                      notif.isRead ? 'opacity-60' : 'bg-zinc-50/60 dark:bg-zinc-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 pr-5">
                      <span className="text-xs font-bold text-zinc-950 dark:text-zinc-50 truncate">
                        {notif.title}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-zinc-400 dark:text-zinc-500 shrink-0">
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-2 pr-5">
                      {notif.message}
                    </p>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Dismiss this notification?')) {
                          onDismiss(notif.id);
                        }
                      }}
                      className="absolute top-3 right-3 p-1 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-all cursor-pointer"
                      title="Dismiss"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
