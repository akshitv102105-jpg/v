import React, { useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Trade, Strategy, Habit, JournalEntry, UserProfile, TradeSide, TradeStatus } from '../types';

export const DataMigration: React.FC = () => {
    const { user } = useAuth();
    const [isMigrating, setIsMigrating] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [progress, setProgress] = useState(0);

    const migrateData = async () => {
        if (!user) {
            setStatus('Please log in first.');
            return;
        }

        if (!confirm('This will upload your local data to Supabase. Existing cloud data with same IDs might be overwritten. Continue?')) {
            return;
        }

        setIsMigrating(true);
        setStatus('Starting migration...');
        setProgress(0);

        try {
            // 1. Migrate Trades
            setStatus('Migrating trades...');
            const localTradesStr = localStorage.getItem('vyuha_trades');
            if (localTradesStr) {
                const trades: Trade[] = JSON.parse(localTradesStr);
                const tradesPayload = trades.map(t => ({
                    user_id: user.id,
                    symbol: t.symbol,
                    side: t.side,
                    entry_price: t.entryPrice,
                    exit_price: t.exitPrice,
                    quantity: t.quantity,
                    leverage: t.leverage || 1,
                    capital: t.capital || 0,
                    status: t.status,
                    entry_date: t.entryDate,
                    exit_date: t.exitDate,
                    risk_reward: t.riskReward || 0,
                    pnl: t.pnl,
                    pnl_percentage: t.pnlPercentage,
                    strategy_id: t.strategyId, // Might need mapping if IDs changed, assuming exact match for now
                    setups: t.setups,
                    entry_reasons: t.entryReasons,
                    mental_state: t.mentalState,
                    tags: t.tags,
                    exit_reasons: t.exitReasons,
                    exit_quality: t.exitQuality,
                    notes: t.notes
                }));

                if (tradesPayload.length > 0) {
                    const { error } = await supabase.from('trades').upsert(tradesPayload); // Using upsert to be safe
                    if (error) throw error;
                }
            }
            setProgress(25);

            // 2. Migrate Strategies
            setStatus('Migrating strategies...');
            const localStrategiesStr = localStorage.getItem('vyuha_strategies');
            if (localStrategiesStr) {
                const strategies: Strategy[] = JSON.parse(localStrategiesStr);
                const stratPayload = strategies.map(s => ({
                    user_id: user.id,
                    name: s.name,
                    description: s.description,
                    version: s.version,
                    status: s.status,
                    stats: s.stats,
                    setups: s.setups,
                    sizing_rules: s.sizingRules,
                    risk_params: s.riskParams,
                    entry_rules: s.entryRules,
                    exit_rules: s.exitRules
                }));

                if (stratPayload.length > 0) {
                    const { error } = await supabase.from('strategies').upsert(stratPayload);
                    if (error) throw error;
                }
            }
            setProgress(50);

            // 3. Migrate Habits
            setStatus('Migrating habits...');
            const localHabitsStr = localStorage.getItem('vyuha_habits');
            // Assuming local habits structure matches needed format or requires minor tweaks
            // Since habits are simpler, we'll skip complex mapping if not defined
            // If local habits are just a list of strings, we might need to create habit objects
            if (localHabitsStr) {
                // Determine structure. If it's old simple list:
                let habits: any[] = [];
                try {
                    habits = JSON.parse(localHabitsStr);
                } catch (e) { }

                // If habits are just objects with name
                const habitPayload = habits.map((h: any) => ({
                    user_id: user.id,
                    name: h.name || h,
                    frequency: h.frequency || 'daily'
                }));

                if (habitPayload.length > 0) {
                    // We can't easily upsert habits without IDs, so we might insert duplicates if not careful.
                    // A safer bet is to insert if name doesn't exist for user.
                    // For simplicity in migration, we'll try insert and ignore unique constraint errors if any?
                    // Or just insert.
                    const { error } = await supabase.from('habits').upsert(habitPayload, { onConflict: 'user_id, name' });
                    if (error) console.error("Habit migration partial error:", error);
                }
            }
            setProgress(75);

            // 4. Migrate Journal Entries
            setStatus('Migrating journal...');
            const localJournalStr = localStorage.getItem('vyuha_journal_entries');
            if (localJournalStr) {
                const entries: JournalEntry[] = JSON.parse(localJournalStr);
                const journalPayload = entries.map(j => ({
                    user_id: user.id,
                    date: j.date,
                    type: j.type,
                    content: j.content // Assuming JSONB structure matches
                }));

                if (journalPayload.length > 0) {
                    const { error } = await supabase.from('journal_entries').upsert(journalPayload, { onConflict: 'user_id, date, type' });
                    if (error) throw error;
                }
            }
            setProgress(90);

            // 5. Migrate Profile Preferences (Tags, etc)
            setStatus('Migrating preferences...');
            const localTags = localStorage.getItem('vyuha_tags');
            const localRisk = localStorage.getItem('vyuha_risk_settings');
            const localGoals = localStorage.getItem('vyuha_profit_goals');

            if (localTags || localRisk || localGoals) {
                const updates: any = {};
                if (localTags) updates.tags = JSON.parse(localTags); // We need to store this in profile probably?
                // Actually the current schema for profile has 'preferences' JSONB. 
                // We should consolidate these there or a separate 'config' column.
                // Let's assume we put them in 'preferences' for now or a new 'settings' jsonb column if it exists.
                // Profile table has: id, nickname, bio, fees, theme, preferences.

                const { data: profile } = await supabase.from('profiles').select('preferences').eq('id', user.id).single();
                const currentPrefs = profile?.preferences || {};

                const newPrefs = {
                    ...currentPrefs,
                    savedTags: localTags ? JSON.parse(localTags) : undefined,
                    savedRiskSettings: localRisk ? JSON.parse(localRisk) : undefined,
                    savedProfitGoals: localGoals ? JSON.parse(localGoals) : undefined
                };

                const { error } = await supabase.from('profiles').update({ preferences: newPrefs }).eq('id', user.id);
                if (error) throw error;
            }

            setProgress(100);
            setStatus('Migration complete! Please refresh the page.');

        } catch (error: any) {
            console.error('Migration failed:', error);
            setStatus(`Migration failed: ${error.message}`);
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div className="p-6 rounded-2xl bg-[#151A25] border border-indigo-500/30 my-8">
            <h3 className="text-xl font-bold text-white mb-4">
                <i className="fa-solid fa-cloud-arrow-up text-indigo-400 mr-2"></i>
                Migrate to Cloud
            </h3>
            <p className="text-slate-400 mb-6 text-sm">
                Move your locally stored data (trades, strategies, journal) to the database.
                This allows you to access your data from any device.
            </p>

            {status && (
                <div className={`mb-4 p-3 rounded bg-[#0B0E14] border ${status.includes('failed') ? 'border-rose-900 text-rose-400' : 'border-indigo-900/50 text-indigo-400'} text-sm`}>
                    {status}
                </div>
            )}

            {isMigrating && (
                <div className="w-full bg-slate-800 rounded-full h-2.5 mb-6">
                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}></div>
                </div>
            )}

            <button
                onClick={migrateData}
                disabled={isMigrating || !user}
                className={`px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all ${isMigrating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {isMigrating ? 'Migrating...' : 'Start Migration'}
            </button>
        </div>
    );
};
