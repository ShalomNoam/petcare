import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { db, setBackendMode } from '@/data';
import { DEMO_PHONE, DEMO_USER_ID, resetDemoStore } from '@/data/demoBackend';
import { syncAutoReminders } from '@/data/reminders';
import type { AuthUser, Profile } from '@/data/types';

import { supabase } from './supabase';

const DEMO_FLAG = 'demo-mode';

type AuthState = {
  user: AuthUser | null;
  profile: Profile | null;
  /** True in on-device demo mode (no Supabase). */
  demo: boolean;
  /** True until the stored session (and its profile) has been loaded. */
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  startDemo: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: AuthUser | null) => {
    if (!u) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await db().getProfile(u.id));
    } catch (e) {
      console.warn('Failed to load profile', e);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const isDemo = (await AsyncStorage.getItem(DEMO_FLAG)) === '1';
      if (isDemo) {
        setBackendMode(true);
        const u = { id: DEMO_USER_ID, phone: DEMO_PHONE };
        if (!mounted) return;
        setDemo(true);
        setUser(u);
        await loadProfile(u);
      } else {
        setBackendMode(false);
        const { data } = await supabase.auth.getSession();
        const u = data.session ? { id: data.session.user.id, phone: data.session.user.phone ?? null } : null;
        if (!mounted) return;
        setUser(u);
        await loadProfile(u);
      }
      if (mounted) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (db().kind === 'demo') return;
      const u = session ? { id: session.user.id, phone: session.user.phone ?? null } : null;
      setUser((prev) => (prev?.id === u?.id ? prev : u));
      // Defer DB calls out of the auth callback (recommended by supabase-js).
      setTimeout(() => loadProfile(u), 0);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      demo,
      loading,
      refreshProfile: () => loadProfile(user),
      signOut: async () => {
        if (demo) {
          await AsyncStorage.removeItem(DEMO_FLAG);
          setBackendMode(false);
          setDemo(false);
          setUser(null);
          setProfile(null);
          return;
        }
        await supabase.auth.signOut();
      },
      startDemo: async () => {
        await resetDemoStore();
        await AsyncStorage.setItem(DEMO_FLAG, '1');
        setBackendMode(true);
        // Derive automatic reminders (next vaccines, daily meds) for the sample pets.
        for (const pet of await db().listPets()) await syncAutoReminders(pet.id);
        const u = { id: DEMO_USER_ID, phone: DEMO_PHONE };
        await loadProfile(u);
        setDemo(true);
        setUser(u);
      },
    }),
    [user, profile, demo, loading, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
