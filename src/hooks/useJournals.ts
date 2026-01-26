
import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { JournalEntry } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useJournals = () => {
    const { user } = useAuth();
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchJournals = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('journal_entries')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;

            const formatted: JournalEntry[] = (data || []).map(j => ({
                id: j.id,
                date: j.date,
                content: j.content,
                mood: j.mood,
                tags: j.tags || [],
                title: j.title,
                type: j.type
            }));
            setEntries(formatted);
        } catch (error) {
            console.error('Error fetching journals:', error);
        } finally {
            setLoading(false);
        }
    };

    const addEntry = async (entry: JournalEntry) => {
        if (!user) return;

        const payload = {
            user_id: user.id,
            date: entry.date,
            content: entry.content,
            mood: entry.mood,
            tags: entry.tags,
            title: entry.title,
            type: entry.type
        };

        const { data, error } = await supabase.from('journal_entries').insert([payload]).select().single();
        if (error) {
            console.error('Error adding journal:', error);
            return;
        }

        const newEntry = { ...entry, id: data.id };
        setEntries(prev => [newEntry, ...prev]);
    };

    const getJournalingStreak = () => {
        // Logic to calculate streak
        // Basic impl
        return 0;
    };

    useEffect(() => {
        fetchJournals();
    }, [user]);

    return { entries, loading, addEntry, getJournalingStreak };
};
