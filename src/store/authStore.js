import { create } from 'zustand';

// Ephemeral auth session state. Holds only what the current session needs; it is
// reset on logout and never persisted — the Supabase client owns token storage and
// rehydration. No Supabase calls live here: useAuth populates this store.

const emptyAuth = {
  userId: null,
  role: null, // 'professional' | 'facility' | 'admin' | null
  isVerified: false,
  status: null, // users.status: 'pending' | 'active' | 'suspended' | null; gates suspended access
  session: null, // Supabase Session (carries the access token); null when signed out
};

export const useAuthStore = create((set) => ({
  ...emptyAuth,

  // False until the first session check completes, so route guards can wait
  // instead of flashing the login page on a refresh.
  isInitialized: false,

  // Set the full auth context from a Supabase session plus the verified flag and
  // account status read from the user's rows. Pass session = null for "signed out".
  setAuth: (session, isVerified = false, status = null) =>
    set({
      session: session ?? null,
      userId: session?.user?.id ?? null,
      role: session?.user?.app_metadata?.role ?? null,
      isVerified: Boolean(isVerified),
      status: status ?? null,
      isInitialized: true,
    }),

  // Update just the verified flag, e.g. after re-fetching the profile.
  setVerified: (isVerified) => set({ isVerified: Boolean(isVerified) }),

  // Clear all session state on logout; isInitialized stays true.
  clearAuth: () => set({ ...emptyAuth, isInitialized: true }),
}));
