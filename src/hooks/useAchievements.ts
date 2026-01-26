
import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { Achievement } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { generateMonthlyAchievements, updateAchievementProgress } from '../utils/achievementGenerator';
import { Trade, JournalEntry } from '../types';

export const useAchievements = () => {
    const { user } = useAuth();
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAchievements = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('achievements')
                .select('*');

            if (error) throw error;

            // formatted
            const formatted: Achievement[] = (data || []).map(a => ({
                id: a.id,
                title: a.title,
                description: a.description,
                difficulty: a.difficulty,
                tier: a.tier,
                category: a.category,
                condition: a.condition, // JSONB auto-parsed by supabase-js
                progress: a.progress,
                isUnlocked: a.is_unlocked,
                unlockedAt: a.unlocked_at,
                month: a.month
            }));

            setAchievements(formatted);
            return formatted;
        } catch (error) {
            console.error('Error fetching achievements:', error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const generateForMonth = async (month: string) => {
        if (!user) return;
        // Check if exists locally or in DB (fetch first to be sure)
        // For simplicity, we assume 'achievements' state is up to date or we check DB
        const { data: existing } = await supabase.from('achievements').select('id').eq('month', month).limit(1);

        if (!existing || existing.length === 0) {
            const newAchievements = generateMonthlyAchievements(month);
            // Insert into DB
            const payload = newAchievements.map(a => ({
                user_id: user.id,
                title: a.title,
                description: a.description,
                difficulty: a.difficulty,
                tier: a.tier,
                category: a.category,
                condition: a.condition,
                progress: a.progress,
                is_unlocked: a.isUnlocked,
                month: a.month
            }));

            const { data, error } = await supabase.from('achievements').insert(payload).select();
            if (!error && data) {
                // Formatting
                const formatted: Achievement[] = data.map(a => ({
                    id: a.id,
                    title: a.title,
                    description: a.description,
                    difficulty: a.difficulty,
                    tier: a.tier,
                    category: a.category,
                    condition: a.condition,
                    progress: a.progress,
                    isUnlocked: a.is_unlocked,
                    unlockedAt: a.unlocked_at,
                    month: a.month
                }));
                setAchievements(prev => [...prev, ...formatted]);
            }
        }
    };

    const updateProgress = async (trades: Trade[], journalEntries: JournalEntry[]) => {
        if (!user || achievements.length === 0) return;

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const updatedList = updateAchievementProgress(achievements, {
            trades,
            journalEntries,
            month: currentMonth
        });

        // Identify changes and bulk update DB
        // Optimized: only update changed ones
        const changed = updatedList.filter(u => {
            const original = achievements.find(a => a.id === u.id);
            return original && (original.progress !== u.progress || original.isUnlocked !== u.isUnlocked);
        });

        if (changed.length > 0) {
            // Apply optimistic update
            setAchievements(updatedList);

            // Persist to DB
            for (const item of changed) {
                await supabase.from('achievements').update({
                    progress: item.progress,
                    is_unlocked: item.isUnlocked,
                    unlocked_at: item.isUnlocked && !item.unlockedAt ? new Date().toISOString() : item.unlockedAt
                }).eq('id', item.id);
            }
        }
    };

    useEffect(() => {
        fetchAchievements();
    }, [user]);

    return { achievements, loading, generateForMonth, updateProgress };
};
