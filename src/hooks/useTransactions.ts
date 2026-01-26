import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Transaction } from '../types';

export const useTransactions = () => {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (error) throw error;

            const mappedTransactions: Transaction[] = data.map(item => ({
                id: item.id,
                type: item.type as 'DEPOSIT' | 'WITHDRAWAL',
                amount: item.amount,
                date: item.date,
                note: item.note,
                accountId: item.account_id
            }));

            setTransactions(mappedTransactions);
        } catch (err: any) {
            console.error('Error fetching transactions:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
        if (!user) return null;
        try {
            const { data, error } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user.id,
                    type: transaction.type,
                    amount: transaction.amount,
                    date: transaction.date,
                    note: transaction.note,
                    account_id: transaction.accountId
                }])
                .select()
                .single();

            if (error) throw error;

            const newTransaction: Transaction = {
                id: data.id,
                type: data.type,
                amount: data.amount,
                date: data.date,
                note: data.note,
                accountId: data.account_id
            };

            setTransactions(prev => [newTransaction, ...prev]);
            return newTransaction;
        } catch (err: any) {
            console.error('Error adding transaction:', err);
            setError(err.message);
            return null;
        }
    };

    const deleteTransaction = async (id: string) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;

            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (err: any) {
            console.error('Error deleting transaction:', err);
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    return { transactions, loading, error, fetchTransactions, addTransaction, deleteTransaction };
};
