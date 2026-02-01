
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password?: string) => Promise<void>;
    signUp: (email: string, password: string, metadata?: any) => Promise<void>;
    signInAnonymously: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signIn: async () => { },
    signUp: async () => { },
    signInAnonymously: async () => { },
    signOut: async () => { },
});


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // Track if we've completed initial session fetch to avoid duplicate renders
    const initialized = useRef(false);

    useEffect(() => {
        let isMounted = true;

        console.log('[AUTH DEBUG] Starting auth initialization...');

        // Get initial session synchronously
        const initializeAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                console.log('[AUTH DEBUG] getSession returned:', { hasSession: !!session, userId: session?.user?.id, error });

                if (isMounted) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    setLoading(false);
                    initialized.current = true;
                    console.log('[AUTH DEBUG] Initial session set, loading=false');
                }
            } catch (error) {
                console.error('[AUTH DEBUG] Error getting session:', error);
                if (isMounted) {
                    setLoading(false);
                    initialized.current = true;
                }
            }
        };

        initializeAuth();

        // Listen for auth changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[AUTH DEBUG] onAuthStateChange fired:', { event, hasSession: !!session, userId: session?.user?.id });

            if (!isMounted) {
                console.log('[AUTH DEBUG] Skipping - component unmounted');
                return;
            }

            // Skip INITIAL_SESSION event as we handle it in getSession
            if (event === 'INITIAL_SESSION') {
                console.log('[AUTH DEBUG] Skipping INITIAL_SESSION - handled by getSession');
                return;
            }

            console.log('[AUTH DEBUG] Updating state from event:', event);
            setSession(session);
            setUser(session?.user ?? null);
        });

        return () => {
            console.log('[AUTH DEBUG] Cleanup - unmounting');
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password?: string) => {
        if (password) {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        } else {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.origin,
                },
            });
            if (error) throw error;
        }
    };

    const signUp = async (email: string, password: string, metadata?: any) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata,
                emailRedirectTo: window.location.origin,
            }
        });
        if (error) throw error;
    };

    const signInAnonymously = async () => {
        const { error } = await supabase.auth.signInAnonymously({
            options: {
                data: {
                    nickname: 'Guest Trader',
                    level: 1,
                    is_guest: true
                }
            }
        });
        if (error) throw error;
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInAnonymously, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

