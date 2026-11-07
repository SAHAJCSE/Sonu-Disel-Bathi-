import React, { useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Package,
  AlertTriangle,
  Info,
  Radio,
  X,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  userRole = 'customer',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'order' | 'stock' | 'system'>('all');

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'order') return n.type === 'order' || n.type === 'status';
    if (filter === 'stock') return n.type === 'stock';
    if (filter === 'system') return n.type === 'system' || n.type === 'announcement';
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
      case 'status':
        return <Package className="w-4 h-4 text-emerald-400" />;
      case 'stock':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'announcement':
        return <Sparkles className="w-4 h-4 text-sky-400" />;
      default:
        return <Info className="w-4 h-4 text-zinc-300" />;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button with Live Indicator */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="View live notifications"
        className={`relative p-2 rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-center border ${
          isOpen
            ? 'bg-zinc-900 text-white border-zinc-700'
            : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-700/80 hover:text-white shadow-xs'
        }`}
      >
        <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs sm:hidden"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-x-2 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-12 z-50 w-auto sm:w-[410px] max-w-[calc(100vw-1rem)] bg-[#1c1c1e] text-white border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10"
            >
              {/* Header */}
              <div className="p-3.5 sm:p-4 bg-[#232326] border-b border-zinc-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5 leading-none">
                      <span>Live Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-mono font-bold border border-red-500/30">
                          {unreadCount} new
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {userRole === 'admin'
                        ? 'Real-time order & inventory updates'
                        : 'Your order updates & workshop notices'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllRead}
                      title="Mark all as read"
                      className="px-2 py-1 text-[11px] font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-md border border-zinc-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-zinc-300" />
                      <span className="hidden xs:inline">Mark read</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="px-3 py-2 bg-[#18181a] border-b border-zinc-800/80 flex items-center gap-1 overflow-x-auto text-[11px] font-semibold">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'order', label: 'Orders' },
                    { id: 'stock', label: 'Stock' },
                    { id: 'system', label: 'Notices' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFilter(t.id)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      filter === t.id
                        ? 'bg-zinc-100 text-zinc-950 font-bold'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Notification List */}
              <div className="max-h-[360px] overflow-y-auto divide-y divide-zinc-800/60 p-1">
                {filteredNotifs.length === 0 ? (
                  <div className="py-10 text-center text-zinc-400 space-y-1">
                    <Bell className="w-7 h-7 mx-auto opacity-30" />
                    <p className="text-xs font-semibold">No notifications</p>
                    <p className="text-[11px] text-zinc-500">
                      Live alerts from the Sonu Diesel Bhatti database will appear here.
                    </p>
                  </div>
                ) : (
                  filteredNotifs.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (!notif.isRead) onMarkRead(notif.id);
                        if (notif.referenceId && onSelectOrder) {
                          onSelectOrder(notif.referenceId);
                          setIsOpen(false);
                        }
                      }}
                      className={`p-3 rounded-xl transition-colors cursor-pointer flex items-start gap-2.5 ${
                        notif.isRead
                          ? 'hover:bg-zinc-800/50 opacity-80'
                          : 'bg-zinc-800/70 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="mt-0.5 p-1.5 rounded-lg bg-zinc-900 border border-zinc-700/80 shrink-0">
                        {getIcon(notif.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-white truncate">
                            {notif.title}
                          </h4>
                          <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                            {formatTime(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-0.5 leading-snug line-clamp-2">
                          {notif.message}
                        </p>
                        {notif.referenceId && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-amber-300 border border-zinc-700">
                              Ref: {notif.referenceId}
                            </span>
                          </div>
                        )}
                      </div>

                      {!notif.isRead && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkRead(notif.id);
                          }}
                          title="Mark read"
                          className="mt-0.5 p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white shrink-0 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 bg-[#18181a] border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Cloud SQL Live Sync</span>
                </span>
                <span className="font-mono text-[10px] text-zinc-500">
                  PostgreSQL Active
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
