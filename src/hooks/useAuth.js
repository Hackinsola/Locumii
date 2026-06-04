import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// All Supabase auth calls live here. Hooks never navigate — each action returns
// { error } so the calling page can decide whether to redirect.

// Read the verified flag from the role-appropriate profile table. A brand-new
// user has no profile row yet (created during onboarding), so this returns false
// until the profile exists and an admin approves it. Admins have no profile.
async function fetchIsVerified(userId, role) {
  if (role !== 'professional' && role !== 'facility') {
    return false;
  }
  const table = role === 'professional' ? 'professional_profiles' : 'facility_profiles';
  const { data, error } = await supabase
    .from(table)
    .select('is_verified')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return Boolean(data?.is_verified);
}

// Read the account status from the user's own users row (RLS: users_select_own).
// Used to block suspended accounts; pending/active are allowed through.
async function fetchAccountStatus(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('status')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data?.status ?? null;
}

// Push the current Supabase session (and derived verified flag + account status)
// into the store. Pass session = null to represent a signed-out state.
async function syncAuthStore(session) {
  const { setAuth, clearAuth } = useAuthStore.getState();
  if (!session) {
    clearAuth();
    return;
  }
  let isVerified = false;
  let status = null;
  try {
    isVerified = await fetchIsVerified(session.user.id, session.user.app_metadata?.role);
  } catch (error) {
    console.error('Failed to load verification status', error);
  }
  try {
    status = await fetchAccountStatus(session.user.id);
  } catch (error) {
    console.error('Failed to load account status', error);
  }
  setAuth(session, isVerified, status);
}

// Mount once at the app root. Loads the existing session on start and keeps the
// store in sync with every subsequent auth state change.
export function useAuthListener() {
  useEffect(() => {
    async function init() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }
        await syncAuthStore(data.session);
      } catch (error) {
        console.error('Auth initialisation failed', error);
        useAuthStore.getState().clearAuth();
      }
    }
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncAuthStore(session).catch((error) =>
        console.error('Auth state sync failed', error)
      );
    });

    return () => listener.subscription.unsubscribe();
  }, []);
}

// Auth actions plus current session state. Safe to call from any page/component;
// it does not open its own auth subscription (that is useAuthListener's job).
export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const userId = useAuthStore((state) => state.userId);
  const email = useAuthStore((state) => state.session?.user?.email ?? null);
  const role = useAuthStore((state) => state.role);
  const isVerified = useAuthStore((state) => state.isVerified);
  const status = useAuthStore((state) => state.status);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => Boolean(state.session));

  const register = useCallback(async ({ email, password, role, phone }) => {
    setLoading(true);
    setError(null);
    try {
      // role/phone ride along in user metadata; the handle_new_user trigger reads
      // them, creates the public.users row, and sets the app_metadata.role claim.
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role, phone } },
      });
      if (signUpError) {
        throw signUpError;
      }
      return { error: null };
    } catch (caught) {
      setError(caught);
      return { error: caught };
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        throw signInError;
      }
      return { error: null };
    } catch (caught) {
      setError(caught);
      return { error: caught };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }
      useAuthStore.getState().clearAuth();
      return { error: null };
    } catch (caught) {
      setError(caught);
      return { error: caught };
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (resetError) {
        throw resetError;
      }
      return { error: null };
    } catch (caught) {
      setError(caught);
      return { error: caught };
    } finally {
      setLoading(false);
    }
  }, []);

  // Set a new password for the recovery session established when the user follows
  // the reset link (the Supabase client picks up the recovery token from the URL).
  const updatePassword = useCallback(async (newPassword) => {
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        throw updateError;
      }
      return { error: null };
    } catch (caught) {
      setError(caught);
      return { error: caught };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    userId,
    email,
    role,
    isVerified,
    status,
    isInitialized,
    isAuthenticated,
    register,
    login,
    logout,
    resetPassword,
    updatePassword,
    loading,
    error,
  };
}
