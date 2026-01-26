import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Account } from '../types';

export const useAccounts = () => {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAccounts = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('accounts')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;

            const mappedAccounts: Account[] = data.map(item => ({
                id: item.id,
                name: item.name,
                currency: item.currency,
                icon: item.icon,
                color: item.color,
                isExclusive: item.is_exclusive
            }));

            setAccounts(mappedAccounts);
        } catch (err: any) {
            console.error('Error fetching accounts:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const addAccount = async (account: Omit<Account, 'id'>) => {
        if (!user) return null;
        try {
            const { data, error } = await supabase
                .from('accounts')
                .insert([{
                    user_id: user.id,
                    name: account.name,
                    currency: account.currency,
                    icon: account.icon,
                    color: account.color,
                    is_exclusive: account.isExclusive
                }])
                .select()
                .single();

            if (error) throw error;

            const newAccount: Account = {
                id: data.id,
                name: data.name,
                currency: data.currency,
                icon: data.icon,
                color: data.color,
                isExclusive: data.is_exclusive
            };

            setAccounts(prev => [...prev, newAccount]);
            return newAccount;
        } catch (err: any) {
            console.error('Error adding account:', err);
            setError(err.message);
            return null;
        }
    };

    const updateAccount = async (id: string, updates: Partial<Account>) => {
        if (!user) return;
        try {
            const payload: any = {};
            if (updates.name) payload.name = updates.name;
            if (updates.currency) payload.currency = updates.currency;
            if (updates.icon) payload.icon = updates.icon;
            if (updates.color) payload.color = updates.color;
            if (updates.isExclusive !== undefined) payload.is_exclusive = updates.isExclusive;

            const { error } = await supabase
                .from('accounts')
                .update(payload)
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;

            setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
        } catch (err: any) {
            console.error('Error updating account:', err);
            setError(err.message);
        }
    };

    const deleteAccount = async (id: string) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('accounts')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;

            setAccounts(prev => prev.filter(a => a.id !== id));
        } catch (err: any) {
            console.error('Error deleting account:', err);
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    return { accounts, loading, error, fetchAccounts, addAccount, updateAccount, deleteAccount };
};
