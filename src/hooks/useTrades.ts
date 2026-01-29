
import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { Trade } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useTrades = () => {
    const { user } = useAuth();
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTrades = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('trades')
                .select('*')
                .order('entry_date', { ascending: false });

            if (error) throw error;

            // Map DB snake_case to CamelCase TS types
            const formatted: Trade[] = (data || []).map(t => ({
                id: t.id,
                symbol: t.symbol,
                side: t.side,
                entryPrice: t.entry_price,
                exitPrice: t.exit_price,
                quantity: t.quantity,
                capital: t.capital,
                leverage: t.leverage,
                exchange: t.exchange,
                entryDate: t.entry_date,
                exitDate: t.exit_date,
                status: t.status,
                tradeType: t.trade_type,
                pnl: t.pnl,
                pnlPercentage: t.pnl_percentage,
                notes: t.notes,
                strategyId: t.strategy_id,
                strategy: t.strategy_name,
                stopLoss: t.stop_loss,
                takeProfit: t.take_profit,
                entryReasons: t.entry_reasons || [],
                exitReasons: t.exit_reasons || [],
                mentalState: t.mental_state || [],
                tags: t.tags || [],
                setups: t.setups || [],
                riskReward: t.risk_reward,
                images: t.images || [],
                isDisciplined: t.is_disciplined,
                xpEarned: t.xp_earned,
                exitQuality: t.exit_quality
            }));
            setTrades(formatted);
        } catch (error) {
            console.error('Error fetching trades:', error);
        } finally {
            setLoading(false);
        }
    };

    const addTrade = async (trade: Trade) => {
        if (!user) return;

        // Map to DB snake_case
        const payload = {
            user_id: user.id,
            symbol: trade.symbol,
            side: trade.side,
            entry_price: trade.entryPrice,
            exit_price: trade.exitPrice,
            quantity: trade.quantity,
            capital: trade.capital,
            leverage: trade.leverage,
            exchange: trade.exchange,
            entry_date: trade.entryDate,
            exit_date: trade.exitDate,
            status: trade.status,
            trade_type: trade.tradeType,
            pnl: trade.pnl,
            pnl_percentage: trade.pnlPercentage,
            notes: trade.notes,
            strategy_id: trade.strategyId || null,
            strategy_name: trade.strategy,
            stop_loss: trade.stopLoss,
            take_profit: trade.takeProfit,
            entry_reasons: trade.entryReasons,
            exit_reasons: trade.exitReasons,
            mental_state: trade.mentalState,
            tags: trade.tags,
            setups: trade.setups,
            risk_reward: trade.riskReward,
            images: trade.images,
            is_disciplined: trade.isDisciplined,
            xp_earned: trade.xpEarned,
            exit_quality: trade.exitQuality
        };

        const { data, error } = await supabase.from('trades').insert([payload]).select().single();
        if (error) {
            console.error('Error adding trade:', error);
            return;
        }

        // Add to local state (optimistic or confirm)
        // Re-mapping back
        const newTrade = { ...trade, id: data.id }; // Use DB ID
        setTrades(prev => [newTrade, ...prev]);
    };

    const updateTrade = async (trade: Trade) => {
        if (!user) return;

        const payload = {
            symbol: trade.symbol,
            side: trade.side,
            entry_price: trade.entryPrice,
            exit_price: trade.exitPrice,
            quantity: trade.quantity,
            capital: trade.capital,
            leverage: trade.leverage,
            exchange: trade.exchange,
            entry_date: trade.entryDate,
            exit_date: trade.exitDate,
            status: trade.status,
            trade_type: trade.tradeType,
            pnl: trade.pnl,
            pnl_percentage: trade.pnlPercentage,
            notes: trade.notes,
            strategy_id: trade.strategyId || null,
            strategy_name: trade.strategy,
            stop_loss: trade.stopLoss,
            take_profit: trade.takeProfit,
            entry_reasons: trade.entryReasons,
            exit_reasons: trade.exitReasons,
            mental_state: trade.mentalState,
            tags: trade.tags,
            setups: trade.setups,
            risk_reward: trade.riskReward,
            images: trade.images,
            is_disciplined: trade.isDisciplined,
            xp_earned: trade.xpEarned,
            exit_quality: trade.exitQuality
        };

        const { error } = await supabase.from('trades').update(payload).eq('id', trade.id);
        if (error) {
            console.error('Error updating trade:', error);
            return;
        }

        setTrades(prev => prev.map(t => t.id === trade.id ? trade : t));
    };

    const deleteTrade = async (id: string) => {
        const { error } = await supabase.from('trades').delete().eq('id', id);
        if (error) {
            console.error('Error deleting trade:', error);
            return;
        }
        setTrades(prev => prev.filter(t => t.id !== id));
    };

    const deleteTrades = async (ids: string[]) => {
        if (!user || ids.length === 0) return;
        const { error } = await supabase.from('trades').delete().in('id', ids);
        if (error) {
            console.error('Error deleting multiple trades:', error);
            return;
        }
        setTrades(prev => prev.filter(t => !ids.includes(t.id)));
    };

    const importTrades = async (newTrades: Trade[]) => {
        if (!user || newTrades.length === 0) return;

        const payload = newTrades.map(trade => ({
            user_id: user.id,
            symbol: trade.symbol,
            side: trade.side,
            entry_price: trade.entryPrice,
            exit_price: trade.exitPrice,
            quantity: trade.quantity,
            capital: trade.capital,
            leverage: trade.leverage,
            exchange: trade.exchange,
            entry_date: trade.entryDate,
            exit_date: trade.exitDate,
            status: trade.status,
            trade_type: trade.tradeType,
            pnl: trade.pnl,
            pnl_percentage: trade.pnlPercentage,
            notes: trade.notes,
            risk_reward: trade.riskReward,
            tags: trade.tags || ['Imported'],
            strategy_name: trade.strategy,
            strategy_id: trade.strategyId || null,
            stop_loss: trade.stopLoss,
            take_profit: trade.takeProfit,
            entry_reasons: trade.entryReasons || [],
            exit_reasons: trade.exitReasons || [],
            mental_state: trade.mentalState || [],
            setups: trade.setups || [],
            images: trade.images || [],
            is_disciplined: trade.isDisciplined,
            xp_earned: trade.xpEarned,
            exit_quality: trade.exitQuality
        }));

        const { data, error } = await supabase.from('trades').insert(payload).select();

        if (error) {
            console.error('Error importing trades:', error);
            alert('Error importing trades to database.');
            return;
        }

        if (data) {
            const formatted: Trade[] = data.map(t => ({
                id: t.id,
                symbol: t.symbol,
                side: t.side,
                entryPrice: t.entry_price,
                exitPrice: t.exit_price,
                quantity: t.quantity,
                capital: t.capital,
                leverage: t.leverage,
                exchange: t.exchange,
                entryDate: t.entry_date,
                exitDate: t.exit_date,
                status: t.status,
                tradeType: t.trade_type,
                pnl: t.pnl,
                pnlPercentage: t.pnl_percentage,
                notes: t.notes,
                strategyId: t.strategy_id,
                strategy: t.strategy_name,
                stopLoss: t.stop_loss,
                takeProfit: t.take_profit,
                entryReasons: t.entry_reasons || [],
                exitReasons: t.exit_reasons || [],
                mentalState: t.mental_state || [],
                tags: t.tags || [],
                setups: t.setups || [],
                riskReward: t.risk_reward,
                images: t.images || [],
                isDisciplined: t.is_disciplined,
                xpEarned: t.xp_earned,
                exitQuality: t.exit_quality
            }));
            setTrades(prev => [...formatted, ...prev]);
        }
    };

    useEffect(() => {
        fetchTrades();
    }, [user]);

    const clearAllTrades = async () => {
        if (!user) return;
        const { error } = await supabase.from('trades').delete().eq('user_id', user.id);
        if (error) {
            console.error('Error clearing all trades:', error);
            return;
        }
        setTrades([]);
    };

    const clearImportedTrades = async () => {
        if (!user) return;
        // Delete trades where trade_type is 'PAST' (standard for imports in this app)
        const { error } = await supabase.from('trades').delete().eq('user_id', user.id).eq('trade_type', 'PAST');
        if (error) {
            console.error('Error clearing imported trades:', error);
            return;
        }
        setTrades(prev => prev.filter(t => t.tradeType !== 'PAST'));
    };

    return { trades, loading, addTrade, updateTrade, deleteTrade, deleteTrades, importTrades, clearAllTrades, clearImportedTrades };
};
