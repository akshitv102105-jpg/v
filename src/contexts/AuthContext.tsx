
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

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('[AUTH DEBUG] getSession returned:', { hasSession: !!session, userId: session?.user?.id, initialized: initialized.current, isMounted });
            if (isMounted && !initialized.current) {
                initialized.current = true;
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
                console.log('[AUTH DEBUG] Initial session set, loading=false');
            }
        });

        // Listen for auth changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[AUTH DEBUG] onAuthStateChange fired:', { event, hasSession: !!session, userId: session?.user?.id, initialized: initialized.current, isMounted });

            // Only update state after initialization or for actual auth events
            if (!isMounted) {
                console.log('[AUTH DEBUG] Skipping - component unmounted');
                return;
            }

            // Skip the INITIAL_SESSION event if we've already initialized
            if (event === 'INITIAL_SESSION' && initialized.current) {
                console.log('[AUTH DEBUG] Skipping INITIAL_SESSION - already initialized');
                return;
            }

            console.log('[AUTH DEBUG] Updating state from event:', event);
            // For actual auth events (SIGNED_IN, SIGNED_OUT, etc.), update state
            setSession(session);
            setUser(session?.user ?? null);

            // Mark as initialized if not already (for edge case where onAuthStateChange fires before getSession)
            if (!initialized.current) {
                initialized.current = true;
                setLoading(false);
                console.log('[AUTH DEBUG] Initialized from onAuthStateChange, loading=false');
            }
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
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

