import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, Megaphone, ClipboardList, Calendar, AlertCircle, Info } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'task' | 'leave' | 'complaint' | 'system' | 'general';
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  link?: string;
  createdAt: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  announcement: <Megaphone className="w-4 h-4" />,
  task: <ClipboardList className="w-4 h-4" />,
  leave: <Calendar className="w-4 h-4" />,
  complaint: <AlertCircle className="w-4 h-4" />,
  system: <Info className="w-4 h-4" />,
  general: <Bell className="w-4 h-4" />,
};

const PRIORITY_COLOR: Record<string, string> = {
  high: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10',
  medium: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10',
  low: 'text-[#256c1d] bg-[#eaf6e6] dark:bg-emerald-500/10',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NotificationBellProps {
  userId?: string;
  organizationId?: string;
}

export function NotificationBell({ userId, organizationId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const socketRef = useRef<Socket | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications?limit=30');
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Socket.io real-time
  useEffect(() => {
    if (!userId || !organizationId) return;

    const rawUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '');
    const socket = io(rawUrl && rawUrl !== '' ? rawUrl : window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-user', userId);
      socket.emit('join-org', organizationId);
    });

    socket.on('connect_error', () => {
      // silently ignore — REST polling is the fallback
    });

    socket.on('notification', (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev].slice(0, 30));
      setUnreadCount((c) => c + 1);
    });

    socket.on('notification-count-update', () => {
      fetchNotifications();
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, organizationId, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const deleteNotif = async (id: string, wasUnread: boolean) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const visible = useMemo(() => (filter === 'unread' ? notifications.filter((n) => !n.read) : notifications), [notifications, filter]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn('h-11 w-11 rounded-full flex items-center justify-center transition-colors relative outline-none focus-visible:ring-2 focus-visible:ring-[#54b947]/50', open ? 'bg-[#eaf6e6] dark:bg-emerald-500/10' : 'hover:bg-slate-50 dark:hover:bg-muted')}
        aria-label="Notifications"
      >
        <Bell className="w-[18px] h-[18px] text-slate-600 dark:text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#54b947] ring-2 ring-white dark:ring-card flex items-center justify-center text-[9px] font-bold text-[#0b1d14] leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-[-72px] sm:right-0 top-full mt-4 w-[min(420px,92vw)] max-h-[560px] flex flex-col rounded-3xl bg-white dark:bg-card shadow-[0_24px_60px_-18px_rgba(16,24,40,0.28)] ring-1 ring-black/5 dark:ring-white/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="font-semibold text-lg text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#e3f7dd] text-[#1f6a17] dark:bg-emerald-500/15 dark:text-emerald-400">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-full bg-[#f4f6f3] dark:bg-muted hover:bg-slate-200/70 flex items-center justify-center text-slate-600 dark:text-muted-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="inline-flex p-1 rounded-full bg-[#f4f6f3] dark:bg-muted">
                {(['all', 'unread'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'px-4 h-8 rounded-full text-xs font-semibold capitalize transition-colors',
                      filter === f ? 'bg-white dark:bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#256c1d] dark:text-emerald-400 hover:underline"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-2.5 pb-2.5">
            {loading ? (
              <div className="flex items-center justify-center py-14">
                <div className="w-5 h-5 border-2 border-[#54b947] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
                <span className="w-14 h-14 rounded-full bg-[#f4f6f3] dark:bg-muted flex items-center justify-center"><Bell className="w-6 h-6 opacity-50" /></span>
                <p className="text-sm">{filter === 'unread' ? "You're all caught up" : 'No notifications yet'}</p>
              </div>
            ) : (
              visible.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    'flex gap-3 px-3 py-3 rounded-2xl transition-colors group hover:bg-[#f4f6f3] dark:hover:bg-muted/30',
                    !notif.read && 'bg-[#f7fbf5] dark:bg-emerald-500/5'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', PRIORITY_COLOR[notif.priority])}>
                    {TYPE_ICON[notif.type] || TYPE_ICON.general}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm leading-snug text-foreground', !notif.read && 'font-semibold')}>
                        {notif.title}
                      </p>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-[#54b947] shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[11px] text-muted-foreground/70">{timeAgo(notif.createdAt)}</p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.read && (
                          <button
                            onClick={() => markRead(notif.id)}
                            className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-muted text-muted-foreground hover:text-[#256c1d]"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotif(notif.id, !notif.read)}
                          className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 text-center">
              <button
                onClick={fetchNotifications}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
