import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { MemberProfile, MembershipApplication, StaffRole } from '../types/community';

interface AuthContextValue {
  session: Session | null;
  profile: MemberProfile | null;
  application: MembershipApplication | null;
  staffRole: StaffRole | null;
  loading: boolean;
  refreshMembership: () => Promise<void>;
  signInWithGoogle: (next?: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (name: string, email: string, password: string) => Promise<boolean>;
  resendSignupConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [application, setApplication] = useState<MembershipApplication | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMembership = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!nextSession?.user) {
      setProfile(null);
      setApplication(null);
      setStaffRole(null);
      return;
    }

    const userId = nextSession.user.id;
    const [profileResult, applicationResult, staffResult] = await Promise.all([
      supabase.from('member_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('membership_applications').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('staff_roles').select('role').eq('user_id', userId).maybeSingle(),
    ]);

    if (profileResult.error) console.error('Unable to load member profile:', profileResult.error);
    if (applicationResult.error) console.error('Unable to load membership application:', applicationResult.error);
    if (staffResult.error) console.error('Unable to load staff role:', staffResult.error);
    setProfile((profileResult.data as MemberProfile | null) ?? null);
    setApplication((applicationResult.data as MembershipApplication | null) ?? null);
    setStaffRole((staffResult.data?.role as StaffRole | undefined) ?? null);
  }, []);

  const refreshMembership = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadMembership(data.session);
  }, [loadMembership]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      await loadMembership(data.session);
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => {
        if (!mounted) return;
        loadMembership(nextSession).finally(() => mounted && setLoading(false));
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadMembership]);

  const signInWithGoogle = useCallback(async (next = '/community') => {
    window.sessionStorage.setItem('talkware-auth-next', next);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signUpWithPassword = useCallback(async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return !data.session;
  }, []);

  const resendSignupConfirmation = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo(() => ({
    session,
    profile,
    application,
    staffRole,
    loading,
    refreshMembership,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    resendSignupConfirmation,
    signOut,
  }), [session, profile, application, staffRole, loading, refreshMembership, signInWithGoogle, signInWithPassword, signUpWithPassword, resendSignupConfirmation, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
