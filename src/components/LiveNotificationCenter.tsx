import React, { useState } from 'react';
import { LiveNotification } from '../types.ts';

interface LiveNotificationCenterProps {
  notifications: LiveNotification[];
  unreadCount: number;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onSelectOrder?: (orderNumber: string) => void;
  userRole?: string;
}

export const LiveNotificationCenter: React.FC<LiveNotificationCenterProps> = ({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
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
        className="px-2.5 py-1.5 rounded-md border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
      >
        <span>Alerts</span>
        {unreadCount > 0 && (
          <span className="px-1.5 py-0.2 rounded bg-zinc-950 text-white font-mono text-[10px]">
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
          <div className="fixed inset-x-3 top-14 sm:absolute sm:inset-auto sm:right-0 sm:top-10 z-50 w-auto sm:w-80 bg-white text-zinc-950 border border-zinc-200 rounded-md shadow-lg overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-zinc-200 flex items-center justify-between">
              <span className="text-xs font-semibold">Notifications</span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="text-[11px] text-zinc-500 hover:text-zinc-950 underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-950 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">
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
                    className={`p-3 cursor-pointer hover:bg-zinc-50 transition-colors ${
                      notif.isRead ? 'opacity-65' : 'bg-zinc-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-950 truncate">
                        {notif.title}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
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
