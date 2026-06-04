import { create } from 'zustand';

// In-app notification feed state for the signed-in user. Like authStore, this holds
// only state and pure setters — no Supabase calls (useNotifications owns those and
// the realtime subscription). Keeps at most the latest MAX_FEED notifications.

const MAX_FEED = 20;

function countUnread(list) {
  return list.reduce((n, item) => (item.is_read ? n : n + 1), 0);
}

export const useNotifStore = create((set) => ({
  notifications: [], // newest first
  unreadCount: 0,

  // Replace the whole feed (initial fetch). Trims to the latest MAX_FEED.
  setNotifications: (list) => {
    const trimmed = (list ?? []).slice(0, MAX_FEED);
    set({ notifications: trimmed, unreadCount: countUnread(trimmed) });
  },

  // Prepend a newly-arrived notification (realtime INSERT), keeping the cap.
  addNotification: (notif) =>
    set((state) => {
      if (state.notifications.some((n) => n.id === notif.id)) {
        return state; // de-dupe: ignore an id we already have
      }
      const next = [notif, ...state.notifications].slice(0, MAX_FEED);
      return { notifications: next, unreadCount: countUnread(next) };
    }),

  markOneRead: (id) =>
    set((state) => {
      const next = state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      );
      return { notifications: next, unreadCount: countUnread(next) };
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    })),

  reset: () => set({ notifications: [], unreadCount: 0 }),
}));
