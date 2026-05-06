'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, Loader2, Info } from 'lucide-react';

export default function NotificationInbox({ appId, token }: { appId: string, token?: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/apps/${appId}/notifications`, { headers });
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data);
        setUnreadCount(json.data.filter((n: any) => n.status === 'unread').length);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, [appId, token]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const toMark = notifications.filter(n => n.status === 'unread').map(n => n.id);
    await fetch(`/api/apps/${appId}/notifications`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ ids: toMark, status: 'read' })
    });
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors focus:outline-none"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full ring-2 ring-card shadow-sm animate-pulse-glow" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 flex flex-col"
          >
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex justify-between items-center shrink-0">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                  <Check size={14} /> Mark all read
                </button>
              )}
            </div>
            
            <div className="overflow-y-auto max-h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mb-2 text-primary/50" />
                  <p className="text-xs">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-muted-foreground">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                    <Bell className="w-6 h-6 opacity-20" />
                  </div>
                  <p className="text-sm font-medium">No notifications yet</p>
                  <p className="text-xs mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map(n => (
                    <div key={n.id} className={`p-4 transition-colors hover:bg-muted/50 cursor-pointer ${n.status === 'unread' ? 'bg-primary/5' : ''}`}>
                      <div className="flex gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.status === 'unread' ? 'bg-primary' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${n.status === 'unread' ? 'text-foreground' : 'text-foreground/80'}`}>{n.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                          <p className="text-xs text-muted-foreground/60 mt-2 font-medium">{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
