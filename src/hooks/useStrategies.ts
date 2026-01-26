
import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { Strategy } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useStrategies = () => {
    const { user } = useAuth();
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStrategies = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('strategies')
                .select('*');

            if (error) throw error;

            const formatted: Strategy[] = (data || []).map(s => ({
                id: s.id,
                name: s.name,
                description: s.description,
                version: s.version,
                status: s.status,
                stats: s.stats || { totalTrades: 0, winRate: 0, avgRR: 0, netRoi: 0, totalPnl: 0 },
                setups: s.setups || [],
                sizingRules: s.sizing_rules || [],
                riskParams: s.risk_params || { maxRiskPerTrade: 1, minRR: 2 },
                entryRules: s.entry_rules || { primary: [], secondary: [] },
                exitRules: s.exit_rules || { primary: [], secondary: [] }
            }));
            setStrategies(formatted);
        } catch (error) {
            console.error('Error fetching strategies:', error);
        } finally {
            setLoading(false);
        }
    };

    const addStrategy = async (strategy: Strategy) => {
        if (!user) return;

        const payload = {
            user_id: user.id,
            name: strategy.name,
            description: strategy.description,
            version: strategy.version,
            status: strategy.status,
            stats: strategy.stats,
            setups: strategy.setups,
            sizing_rules: strategy.sizingRules,
            risk_params: strategy.riskParams,
            entry_rules: strategy.entryRules,
            exit_rules: strategy.exitRules
        };

        const { data, error } = await supabase.from('strategies').insert([payload]).select().single();
        if (error) {
            console.error('Error adding strategy:', error);
            return;
        }

        const newStrategy = { ...strategy, id: data.id };
        setStrategies(prev => [...prev, newStrategy]);
    };

    const updateStrategy = async (id: string, updates: Partial<Strategy>) => {
        if (!user) return;

        const payload: any = {};
        if (updates.name) payload.name = updates.name;
        if (updates.description) payload.description = updates.description;
        if (updates.version) payload.version = updates.version;
        if (updates.status) payload.status = updates.status;
        if (updates.stats) payload.stats = updates.stats;
        if (updates.setups) payload.setups = updates.setups;
        if (updates.sizingRules) payload.sizing_rules = updates.sizingRules;
        if (updates.riskParams) payload.risk_params = updates.riskParams;
        if (updates.entryRules) payload.entry_rules = updates.entryRules;
        if (updates.exitRules) payload.exit_rules = updates.exitRules;

        const { error } = await supabase
            .from('strategies')
            .update(payload)
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error updating strategy:', error);
            return;
        }

        setStrategies(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const deleteStrategy = async (id: string) => {
        if (!user) return;

        const { error } = await supabase
            .from('strategies')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error deleting strategy:', error);
            return;
        }

        setStrategies(prev => prev.filter(s => s.id !== id));
    };

    useEffect(() => {
        fetchStrategies();
    }, [user]);

    return { strategies, loading, addStrategy, updateStrategy, deleteStrategy };
};
