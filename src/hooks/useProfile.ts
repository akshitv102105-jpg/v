
import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useProfile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                throw error;
            }

            if (data) {
                // Map DB to UserProfile
                setProfile({
                    nickname: data.username,
                    email: data.email,
                    avatarImage: data.avatar_url,
                    theme: data.theme,
                    fees: data.fees,
                    preferences: data.preferences,
                    level: data.level,
                    xp: data.xp,
                    hp: data.hp,
                    mana: data.mana,
                    comboMultiplier: data.combo_multiplier,
                    characterType: data.character_type,
                    bio: data.bio || 'Ready to trade.',
                    primaryExchange: data.primary_exchange || 'Binance',
                    timezone: data.timezone || 'UTC'
                });
            } else {
                // Create default profile
                const defaultProfile = {
                    id: user.id,
                    username: user.email?.split('@')[0] || 'Trader',
                    email: user.email,
                    level: 1,
                    xp: 0,
                    hp: 100,
                    mana: 100,
                    combo_multiplier: 1,
                    fees: { maker: 0.02, taker: 0.05, type: 'PERCENTAGE' }
                };

                const { error: insertError } = await supabase.from('profiles').insert([defaultProfile]);
                if (insertError) throw insertError;

                setProfile({
                    nickname: defaultProfile.username,
                    email: defaultProfile.email,
                    level: 1,
                    xp: 0,
                    hp: 100,
                    mana: 100,
                    comboMultiplier: 1,
                    fees: defaultProfile.fees as any,
                    bio: 'New System',
                    primaryExchange: 'Binance',
                    timezone: 'UTC'
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async (updates: Partial<UserProfile>) => {
        if (!user) return;

        const payload: any = {};
        if (updates.nickname) payload.username = updates.nickname;
        if (updates.avatarImage) payload.avatar_url = updates.avatarImage;
        if (updates.theme) payload.theme = updates.theme;
        if (updates.fees) payload.fees = updates.fees;
        if (updates.preferences) payload.preferences = updates.preferences;
        if (updates.level !== undefined) payload.level = updates.level;
        if (updates.xp !== undefined) payload.xp = updates.xp;

        const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
        if (error) {
            console.error('Error updating profile:', error);
            return;
        }

        setProfile(prev => prev ? { ...prev, ...updates } : null);
    };

    useEffect(() => {
        fetchProfile();
    }, [user]);

    return { profile, loading, updateProfile };
};
