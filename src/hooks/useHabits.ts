
import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { Habit } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useHabits = () => {
    const { user } = useAuth();
    const [habits, setHabits] = useState<Habit[]>([]);
    const [completions, setCompletions] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);

    const fetchHabits = async () => {
        if (!user) return;
        try {
            // Fetch habits
            const { data: habitsData, error: habitsError } = await supabase
                .from('habits')
                .select('*');
            if (habitsError) throw habitsError;

            // Fetch logs (last 30 days maybe? or all for now)
            const { data: logsData, error: logsError } = await supabase
                .from('habit_logs')
                .select('*');
            if (logsError) throw logsError;

            const formattedHabits: Habit[] = (habitsData || []).map(h => ({
                id: h.id,
                name: h.name,
                frequency: h.frequency,
                streak: h.streak
            }));

            const formattedCompletions: Record<string, boolean> = {};
            (logsData || []).forEach((log: any) => {
                const key = `${log.habit_id}_${log.date}`;
                if (log.completed) formattedCompletions[key] = true;
            });

            setHabits(formattedHabits);
            setCompletions(formattedCompletions);
        } catch (error) {
            console.error('Error fetching habits:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleHabit = async (habitId: string, date: string) => { // date strictly YYYY-MM-DD
        if (!user) return;

        const key = `${habitId}_${date}`;
        const isCompleted = !!completions[key];
        const newValue = !isCompleted;

        // Update optimistic
        setCompletions(prev => ({ ...prev, [key]: newValue }));

        // Upsert to DB
        // Check if log exists
        const { data: existing } = await supabase
            .from('habit_logs')
            .select('id')
            .eq('habit_id', habitId)
            .eq('date', date)
            .single();

        if (existing) {
            await supabase.from('habit_logs').update({ completed: newValue }).eq('id', existing.id);
        } else {
            await supabase.from('habit_logs').insert([{
                user_id: user.id,
                habit_id: habitId,
                date: date,
                completed: newValue
            }]);
        }

        // Recalculate streak logic could be here or server-side
    };

    const addHabit = async (name: string) => {
        if (!user) return;
        const { data, error } = await supabase
            .from('habits')
            .insert([{ user_id: user.id, name, frequency: 'daily', streak: 0 }])
            .select()
            .single();

        if (data) {
            setHabits(prev => [...prev, { id: data.id, name: data.name, frequency: data.frequency, streak: data.streak }]);
        }
    };

    useEffect(() => {
        fetchHabits();
    }, [user]);

    return { habits, completions, toggleHabit, addHabit, loading };
};
