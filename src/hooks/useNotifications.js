import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useNotifStore } from '@/store/notifStore';

const FEED_SIZE = 20;

// Owns the notification feed: the initial fetch, mark-read mutations, and a realtime
// subscription that pushes new rows into notifStore as they are inserted server-side
// (by the DB notification triggers). This is the single place that touches Supabase
// for notifications; components read notifStore via the values this hook returns.
export function useNotifications() {
  const userId = useAuthStore((state) => state.userId);
  const notifications = useNotifStore((state) => state.notifications);
  const unreadCount = useNotifStore((state) => state.unreadCount);
  const setNotifications = useNotifStore((state) => state.setNotifications);
  const addNotification = useNotifStore((state) => state.addNotification);
  const markOneRead = useNotifStore((state) => state.markOneRead);
  const markAllRead = useNotifStore((state) => state.markAllRead);
  const reset = useNotifStore((state) => state.reset);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      reset();
      setLoading(false);
      return;
    }
    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('id, type, title, body, link, is_read, created_at')
        .order('created_at', { ascending: false })
        .range(0, FEED_SIZE - 1);
      if (fetchError) {
        throw fetchError;
      }
      setNotifications(data ?? []);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [userId, setNotifications, reset]);

  // Mark one read: optimistic store update, then persist (RLS + the guard trigger
  // allow only is_read to change).
  const markAsRead = useCallback(
    async (id) => {
      markOneRead(id);
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (updateError) {
        setError(updateError);
      }
    },
    [markOneRead]
  );

  const markAllAsRead = useCallback(async () => {
    markAllRead();
    if (!userId) {
      return;
    }
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (updateError) {
      setError(updateError);
    }
  }, [markAllRead, userId]);

  // Initial fetch whenever the signed-in user changes.
  useEffect(() => {
    // Data fetching lives in hooks (see other list hooks); setState runs only after
    // the awaited query resolves, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime: push new notifications into the store without a refetch. RLS already
  // scopes the user's own rows, and the filter keeps the channel to this user.
  useEffect(() => {
    if (!userId) {
      return undefined;
    }
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          addNotification(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, addNotification]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
