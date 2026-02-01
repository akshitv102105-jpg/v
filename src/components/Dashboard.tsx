
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Trade, TradeStatus, View, getCurrencyFormatter, ProfitGoals, RiskSettings, Habit, HabitCompletions, FocusTask, Strategy, Tag, FeeConfig, TradeSide, UserProfile, TAG_COLORS } from '../types';
import TradeDetailsModal from './TradeDetailsModal';
import RiskRewardAnimation from './RiskRewardAnimation';
import GreetingBanner from './GreetingBanner';

interface DashboardProps {
    trades: Trade[];
    strategies: Strategy[];
    availableTags: Record<string, Tag[]>;
    onAddClick: () => void;
    onCloseTrade?: (tradeId: string, exitPrice: number, exitDate: string, extraData?: Partial<Trade>) => void;
    onViewChange: (view: View) => void;
    onNavigateToPlaybook: (tab: string) => void;
    baseCurrency: string;
    profitGoals: ProfitGoals;
    riskSettings: RiskSettings;
    portfolioBalance: number;
    habits: Habit[];
    habitCompletions: HabitCompletions;
    onToggleHabit: (habitId: string, dateStr: string) => void;
    focusTasks: FocusTask[];
    onAddFocusTask: (task: FocusTask) => void;
    onToggleFocusTask: (id: string) => void;
    onDeleteFocusTask: (id: string) => void;
    userFees?: FeeConfig;
    nickname: string;
    enableAnimations: boolean;
    rank?: { name: string; color: string; shadow: string };
    userProfile?: UserProfile;
}

const Dashboard: React.FC<DashboardProps> = ({
    trades, strategies, availableTags, onAddClick, onCloseTrade, onViewChange, onNavigateToPlaybook,
    baseCurrency, profitGoals, riskSettings, portfolioBalance,
    habits, habitCompletions, onToggleHabit,
    focusTasks, onAddFocusTask, onToggleFocusTask, onDeleteFocusTask,
    userFees, nickname, enableAnimations, rank, userProfile
}) => {
    const currency = getCurrencyFormatter(baseCurrency);

    // Support multiple open trades
    const openTrades = useMemo(() => trades.filter(t => t.status === TradeStatus.OPEN), [trades]);

    const recentTrades = trades.filter(t => t.status === TradeStatus.CLOSED)
        .sort((a, b) => new Date(b.exitDate || b.entryDate).getTime() - new Date(a.exitDate || a.entryDate).getTime())
        .slice(0, 4);

    // --- Journal Streak Logic ---
    const journalHabit = habits.find(h => h.name.toLowerCase().includes('journal'));
    const displayHabits = habits; // Show all habits for sync parity

    const journalStreak = useMemo(() => {
        if (!journalHabit) return 0;
        let streak = 0;
        let checkDate = new Date();
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        // If not done today, start check from yesterday
        if (!habitCompletions[`${journalHabit.id}_${todayStr}`]) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        while (true) {
            const y = checkDate.getFullYear();
            const m = String(checkDate.getMonth() + 1).padStart(2, '0');
            const d = String(checkDate.getDate()).padStart(2, '0');
            const dStr = `${y}-${m}-${d}`;

            if (habitCompletions[`${journalHabit.id}_${dStr}`]) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }, [journalHabit, habitCompletions]);

    // --- Live PnL State for Risk Tracking ---
    const [openPnLs, setOpenPnLs] = useState<Record<string, number>>({});

    const handlePnlUpdate = useCallback((tradeId: string, pnl: number) => {
        setOpenPnLs(prev => {
            if (Math.abs(prev[tradeId] - pnl) < 0.01) return prev; // Debounce micro updates
            return { ...prev, [tradeId]: pnl };
        });
    }, []);

    // --- View Details Modal State ---
    const [viewTrade, setViewTrade] = useState<Trade | null>(null);

    // --- Enhanced Exit Modal State ---
    const [showExitModal, setShowExitModal] = useState(false);
    const [selectedExitTrade, setSelectedExitTrade] = useState<Trade | null>(null);

    // Default form state
    const [exitForm, setExitForm] = useState({
        price: '',
        date: new Date().toISOString().slice(0, 16),
        strategy: 'Manual Close',
        notes: '',
        quality: 0,
        reasons: [] as string[],
        mental: [] as string[],
        general: [] as string[],
        checklist: [] as string[]
    });

    // Tag Input States for Exit Modal
    const [exitReasonInput, setExitReasonInput] = useState('');
    const [exitMentalInput, setExitMentalInput] = useState('');
    const [exitGeneralInput, setExitGeneralInput] = useState('');

    const getTagStyles = (tagName: string) => {
        let tagDef: Tag | undefined;
        if (availableTags) {
            Object.values(availableTags).forEach((categoryTags: Tag[]) => {
                if (!tagDef) tagDef = categoryTags.find(t => t.name === tagName);
            });
        }

        const color = tagDef?.color || 'slate';
        const styles = TAG_COLORS[color] || TAG_COLORS.slate;
        const isBold = tagDef?.isBold;
        const hasGlow = tagDef?.hasGlow;

        return `px-2 py-1 rounded text-[10px] border flex items-center gap-1 transition-all ${styles.bg} ${styles.border} ${styles.text} ${isBold ? 'font-bold' : 'font-medium'} ${hasGlow ? styles.glow : ''}`;
    };

    // --- Focus Task State ---
    const [newTaskText, setNewTaskText] = useState('');
    const [isAddingTask, setIsAddingTask] = useState(false);

    // Modal Price Fetching State
    const [isFetchingExitPrice, setIsFetchingExitPrice] = useState(false);

    const fetchCurrentPriceForExit = async () => {
        if (!selectedExitTrade) return;
        setIsFetchingExitPrice(true);
        try {
            let normalizedSymbol = selectedExitTrade.symbol.toUpperCase().replace('/', '');
            const isPair = normalizedSymbol.endsWith('USDT') || normalizedSymbol.endsWith('USDC') || normalizedSymbol.endsWith('BUSD') || (normalizedSymbol.length > 4 && (normalizedSymbol.endsWith('BTC') || normalizedSymbol.endsWith('ETH')));
            if (!isPair) {
                normalizedSymbol += 'USDT';
            }

            const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${normalizedSymbol}`);
            const data = await response.json();
            if (data.price) {
                setExitForm(prev => ({ ...prev, price: data.price }));
            }
        } catch (e) { }
        finally { setIsFetchingExitPrice(false); }
    };

    // Open Exit Modal and Initialize Defaults
    const handleOpenExitModal = (trade: Trade, currentPrice?: number) => {
        setSelectedExitTrade(trade);
        setExitForm({
            price: currentPrice ? currentPrice.toString() : '',
            date: new Date().toISOString().slice(0, 16),
            strategy: trade.strategy || 'Manual Close',
            notes: '',
            quality: 0,
            reasons: [],
            mental: [],
            general: [],
            checklist: []
        });
        setExitReasonInput('');
        setExitMentalInput('');
        setExitGeneralInput('');
        setShowExitModal(true);
    };

    const handleConfirmExit = () => {
        if (selectedExitTrade && onCloseTrade && exitForm.price) {
            const extraData: Partial<Trade> = {
                exitReasons: exitForm.reasons,
                exitQuality: exitForm.quality > 0 ? exitForm.quality : undefined,
                mentalState: [...(selectedExitTrade.mentalState || []), ...exitForm.mental],
                tags: [...(selectedExitTrade.tags || []), ...exitForm.general],
                exitChecklist: exitForm.checklist,
                notes: selectedExitTrade.notes + (exitForm.notes ? `\n\n[EXIT]: ${exitForm.notes}` : '') + (exitForm.checklist.length > 0 ? `\n[CHECKLIST]: ${exitForm.checklist.join(', ')}` : ''),
            };

            onCloseTrade(selectedExitTrade.id, parseFloat(exitForm.price), exitForm.date, extraData);

            setOpenPnLs(prev => {
                const next = { ...prev };
                delete next[selectedExitTrade.id];
                return next;
            });

            setShowExitModal(false);
            setSelectedExitTrade(null);
        }
    };

    const handleAutoClose = (trade: Trade, price: number, reason: string) => {
        if (onCloseTrade) {
            const extraData: Partial<Trade> = {
                exitReasons: [reason],
                notes: trade.notes + `\n\n[SYSTEM]: Position closed automatically. Trigger: ${reason} @ ${price}`
            };
            onCloseTrade(trade.id, price, new Date().toISOString(), extraData);

            setOpenPnLs(prev => {
                const next = { ...prev };
                delete next[trade.id];
                return next;
            });
        }
    };

    // Helper for adding tags in exit modal
    const addExitTag = (val: string, listKey: 'reasons' | 'mental' | 'general', setInput: (s: string) => void) => {
        if (val && val.trim()) {
            const trimmed = val.trim();
            if (!exitForm[listKey].includes(trimmed)) {
                setExitForm(prev => ({
                    ...prev,
                    [listKey]: [...prev[listKey], trimmed]
                }));
            }
            setInput('');
        }
    };

    const removeExitTag = (tag: string, listKey: 'reasons' | 'mental' | 'general') => {
        setExitForm(prev => ({
            ...prev,
            [listKey]: prev[listKey].filter(t => t !== tag)
        }));
    };

    const calculateProgress = (period: 'daily' | 'weekly' | 'monthly') => {
        const now = new Date();
        // Use standard date string comparison to avoid timezone issues
        const todayString = now.toDateString();

        const closed = trades.filter(t => t.status === TradeStatus.CLOSED);

        const periodPnL = closed.reduce((acc, t) => {
            const d = new Date(t.exitDate || t.entryDate);
            let match = false;
            if (period === 'daily') {
                match = d.toDateString() === todayString;
            }
            else if (period === 'monthly') {
                match = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }
            else if (period === 'weekly') {
                const startOfWeek = new Date(now);
                const day = now.getDay() || 7;
                if (day !== 1) startOfWeek.setDate(now.getDate() - (day - 1));
                startOfWeek.setHours(0, 0, 0, 0);
                match = d >= startOfWeek;
            }
            return match ? acc + (t.pnl || 0) : acc;
        }, 0);

        const targetPct = profitGoals[period].target;
        const targetAmount = (portfolioBalance * targetPct) / 100;
        const startBalanceApprox = portfolioBalance - periodPnL;
        const currentPct = startBalanceApprox > 0 ? (periodPnL / startBalanceApprox) * 100 : 0;

        return { pnl: periodPnL, pct: currentPct, target: targetPct, targetAmount: (startBalanceApprox * targetPct / 100) };
    };

    const dailyGoal = calculateProgress('daily');
    const weeklyGoal = calculateProgress('weekly');
    const monthlyGoal = calculateProgress('monthly');

    // --- LIVE RISK CALCULATION ---
    const riskMetrics = useMemo(() => {
        const now = new Date();
        const todayString = now.toDateString();

        // 1. Trade Frequency: Count trades OPENED today (use string match for reliability)
        const tradesOpenedToday = trades.filter(t => {
            const d = new Date(t.entryDate);
            return d.toDateString() === todayString;
        });
        const tradesTodayCount = tradesOpenedToday.length;

        // 2. Realized PnL: Trades closed today
        const tradesClosedToday = trades.filter(t => {
            if (t.status !== TradeStatus.CLOSED || !t.exitDate) return false;
            const d = new Date(t.exitDate);
            return d.toDateString() === todayString;
        });
        const realizedTodayPnL = tradesClosedToday.reduce((acc, t) => acc + (t.pnl || 0), 0);

        // 3. Unrealized PnL: Sum of live PnLs from Open Positions
        // We only care about open positions for the live drawdown.
        // Filter openPnLs to only include currently open trades (cleanup handles closed ones but double check)
        const currentOpenIds = openTrades.map(t => t.id);
        const unrealizedTodayPnL = currentOpenIds.reduce((acc, id) => acc + (openPnLs[id] || 0), 0);

        // Total Daily PnL (Realized + Unrealized)
        const totalTodayPnL = realizedTodayPnL + unrealizedTodayPnL;

        // Starting balance of the day (Current Portfolio Balance contains Realized PnL already, so remove Realized Today)
        // Note: portfolioBalance passed from App includes closed trade PnL.
        const startOfDayBalance = portfolioBalance - realizedTodayPnL;

        // Daily Drawdown % (Only if we are losing money today)
        let dailyDD = 0;
        if (totalTodayPnL < 0 && startOfDayBalance > 0) {
            dailyDD = (Math.abs(totalTodayPnL) / startOfDayBalance) * 100;
        }

        // Max Monthly Drawdown (Historical based on closed trades)
        let running = 0;
        let peak = 0;
        let maxDD = 0;
        const monthTrades = trades
            .filter(t => t.status === TradeStatus.CLOSED && new Date(t.exitDate || t.entryDate).getMonth() === now.getMonth() && new Date(t.exitDate || t.entryDate).getFullYear() === now.getFullYear())
            .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

        monthTrades.forEach(t => {
            running += (t.pnl || 0);
            if (running > peak) peak = running;
            const dd = peak - running;
            if (dd > maxDD) maxDD = dd;
        });

        // Add current floating DD to monthly if it exceeds historical?
        // For now, let's keep Max Monthly based on realized equity curve for stability, 
        // but Daily DD is the "circuit breaker".
        const maxDDPct = portfolioBalance > 0 ? (maxDD / portfolioBalance) * 100 : 0;

        return { dailyDD, maxDD: maxDDPct, tradesTodayCount, totalTodayPnL };
    }, [trades, portfolioBalance, openPnLs, openTrades]);

    // Determine if trading should be locked based on LIVE metrics
    const isTradingBlocked = useMemo(() => {
        // 1. Check Frequency
        if (riskSettings.maxTradesDay > 0 && riskMetrics.tradesTodayCount >= riskSettings.maxTradesDay) return true;
        // 2. Check Daily Drawdown (Live)
        if (riskSettings.dailyDD > 0 && riskMetrics.dailyDD >= riskSettings.dailyDD) return true;
        return false;
    }, [riskMetrics, riskSettings]);

    // Trade Frequency Status
    const freqStatus = useMemo(() => {
        const max = riskSettings.maxTradesDay || 0;
        if (max === 0) {
            if (riskMetrics.tradesTodayCount === 0) return { label: 'INACTIVE', color: 'text-slate-500', border: 'border-slate-700' };
            return { label: 'OPTIMAL', color: 'text-[#A78BFA]', border: 'border-[#8B5CF6]/20' };
        }
        const count = riskMetrics.tradesTodayCount;
        const usage = count / max;
        if (usage >= 1) return { label: 'LIMIT REACHED', color: 'text-rose-500', border: 'border-rose-500/20' };
        if (usage > 0.7) return { label: 'HIGH', color: 'text-amber-400', border: 'border-amber-500/20' };
        if (count === 0) return { label: 'INACTIVE', color: 'text-slate-500', border: 'border-slate-700' };
        return { label: 'OPTIMAL', color: 'text-emerald-400', border: 'border-emerald-500/20' };
    }, [riskMetrics.tradesTodayCount, riskSettings.maxTradesDay]);

    const handleCreateTask = () => {
        if (!newTaskText.trim()) return;
        onAddFocusTask({ id: Date.now().toString(), text: newTaskText, completed: false, color: 'blue', isBold: false, hasGlow: false });
        setNewTaskText('');
        setIsAddingTask(false);
    };

    const activeStrategyObj = selectedExitTrade ? strategies.find(s => s.name === selectedExitTrade.strategy) : null;

    return (
        <div className="space-y-6 pb-12">

            {/* --- GREETING & STATUS BANNER --- */}
            <GreetingBanner nickname={nickname} rank={rank} userProfile={userProfile} />

            {/* --- ROW 1: Navigation Cards --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <NavCard
                    title={isTradingBlocked ? "Trading Locked" : "New Trade"}
                    subtitle={isTradingBlocked ? "Risk limits exceeded" : "Log a new entry instantly"}
                    icon={isTradingBlocked ? "fa-lock" : "fa-chart-bar"}
                    gradient={isTradingBlocked ? "bg-rose-900/10 border-rose-900/50 cursor-not-allowed opacity-80" : "bg-gradient-to-br from-[#2E1065] to-[#1E1B4B] border-indigo-500/30 hover:border-indigo-500"}
                    iconBg={isTradingBlocked ? "bg-rose-500/20 text-rose-500" : "bg-indigo-500/20 text-indigo-300"}
                    onClick={isTradingBlocked ? () => { } : onAddClick}
                />

                {/* Dedicated Journal Streak Button */}
                <JournalStreakCard
                    streak={journalStreak}
                    onClick={() => onViewChange('journal')}
                />

                <NavCard title="Playbook" subtitle="Your edge & setups" icon="fa-chess-board" gradient="bg-[#151A25] border-slate-800 hover:border-blue-500/50" iconBg="bg-blue-500/10 text-blue-400" onClick={() => onViewChange('playbook')} />

                <NavCard title="Trade Log" subtitle="Detailed history & stats" icon="fa-clock-rotate-left" gradient="bg-[#151A25] border-slate-800 hover:border-amber-500/50" iconBg="bg-amber-500/10 text-amber-400" onClick={() => onViewChange('analytics')} />
            </div>

            {/* --- ROW 2: Open Positions (Concurrent) --- */}
            {openTrades.length > 0 && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3 mb-3 px-1">
                        <h2 className="text-lg font-bold text-white">Open Positions</h2>
                        <span className="bg-[#2E1065] text-[#A78BFA] border border-[#8B5CF6]/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            {openTrades.length} Active
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {openTrades.map(trade => (
                            <ActivePositionCard
                                key={trade.id}
                                trade={trade}
                                baseCurrency={baseCurrency}
                                onClose={(t, price) => handleOpenExitModal(t, price)}
                                onAutoClose={handleAutoClose}
                                onPnlUpdate={handlePnlUpdate}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* --- LIVE ANIMATION: Risk & Reward --- */}
            <RiskRewardAnimation
                dailyProfit={riskMetrics.totalTodayPnL}
                dailyGoal={dailyGoal.targetAmount}
                dailyDD={riskMetrics.dailyDD}
                maxDailyDD={riskSettings.dailyDD}
                tradeCount={riskMetrics.tradesTodayCount}
                maxTrades={riskSettings.maxTradesDay}
                enabled={enableAnimations}
            />

            {/* --- ROW 3: Mission Control & Goals --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#151A25] p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400"><i className="fa-solid fa-rocket"></i></div>
                        <h2 className="text-lg font-bold text-white">Mission Control</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                {(() => {
                                    const now = new Date();
                                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                                    const doneCount = displayHabits.filter(h => habitCompletions[`${h.id}_${todayStr}`]).length;
                                    return (
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Daily Habits
                                            <span className="ml-1 bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                                                {doneCount}/{displayHabits.length}
                                            </span>
                                        </span>
                                    );
                                })()}
                            </div>
                            <div className="space-y-3">
                                {displayHabits.map(habit => {
                                    const now = new Date();
                                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                                    const isDone = habitCompletions[`${habit.id}_${todayStr}`];

                                    // Calc Streak
                                    let streak = 0;
                                    let checkDate = new Date();
                                    if (!isDone) checkDate.setDate(checkDate.getDate() - 1); // Start checking from yesterday if not done today

                                    while (true) {
                                        const dStr = checkDate.toISOString().split('T')[0];
                                        if (habitCompletions[`${habit.id}_${dStr}`]) {
                                            streak++;
                                            checkDate.setDate(checkDate.getDate() - 1);
                                        } else {
                                            break;
                                        }
                                    }

                                    return (
                                        <div key={habit.id} onClick={() => onToggleHabit(habit.id, todayStr)} className="flex items-center justify-between cursor-pointer group">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-5 w-5 rounded border flex items-center justify-center transition-all ${isDone ? 'bg-[#8B5CF6] border-[#8B5CF6]' : 'border-slate-600 bg-transparent group-hover:border-slate-500'}`}>
                                                    {isDone && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                                                </div>
                                                <span className={`text-sm ${isDone ? 'text-slate-400 line-through' : 'text-slate-200'}`}>{habit.name}</span>
                                            </div>
                                            {streak > 1 && (
                                                <div className="flex items-center gap-1 text-[10px] text-orange-500 font-bold bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                                                    <i className="fa-solid fa-fire"></i> {streak}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {displayHabits.length === 0 && <p className="text-xs text-slate-600 italic">No habits configured.</p>}
                            </div>
                        </div>

                        <div className="bg-gradient-to-b from-[#1E2330] via-[#151A25] to-[#0B0E14] rounded-xl border border-slate-800 p-0 flex flex-col relative group/focus overflow-hidden">
                            {/* Decorative Top Line */}
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-50"></div>

                            {/* Header */}
                            <div className="flex justify-between items-center p-4 pb-2">
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                    <i className="fa-solid fa-crosshairs"></i> Session Focus
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">{focusTasks.filter(t => !t.completed).length} Active</span>
                            </div>

                            {/* Task List */}
                            <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar max-h-[180px] px-2 min-h-[140px]">
                                {focusTasks.length === 0 && !isAddingTask && (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50 py-4">
                                        <i className="fa-solid fa-wind text-2xl mb-2"></i>
                                        <p className="text-[10px] uppercase tracking-wider">All Clear</p>
                                    </div>
                                )}

                                {focusTasks.map(task => (
                                    <div key={task.id} className={`flex items-center justify-between group p-2 rounded-lg transition-all duration-200 border border-transparent ${task.completed ? 'opacity-50 hover:opacity-70' : 'hover:bg-[#2A303C] hover:border-slate-700/50 hover:shadow-lg'}`}>
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <button
                                                onClick={() => onToggleFocusTask(task.id)}
                                                className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all duration-300 shrink-0 ${task.completed
                                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500 scale-95'
                                                    : 'border-slate-600 hover:border-indigo-400 bg-[#0B0E14]'}`}
                                            >
                                                {task.completed && <i className="fa-solid fa-check text-[8px]"></i>}
                                            </button>
                                            <span className={`text-sm truncate transition-all ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200 font-medium'}`}>{task.text}</span>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                            <div className={`h-1.5 w-1.5 rounded-full shadow-[0_0_5px_currentColor] ${task.color === 'blue' ? 'text-blue-500 bg-blue-500' : 'text-amber-500 bg-amber-500'}`}></div>
                                            <button onClick={() => onDeleteFocusTask(task.id)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 transition-colors">
                                                <i className="fa-solid fa-trash text-[10px]"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add Task Input Area */}
                            <div className="mt-auto p-3 bg-[#0B0E14]/50 border-t border-slate-800 backdrop-blur-sm">
                                <div className="flex items-center gap-2 bg-[#0F1218] border border-slate-700/50 p-2 rounded-lg transition-colors focus-within:border-indigo-500/50 focus-within:bg-[#151A25]">
                                    <i className="fa-solid fa-plus text-slate-500 text-xs pl-1"></i>
                                    <input
                                        type="text"
                                        value={newTaskText}
                                        onChange={(e) => setNewTaskText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                                        className="w-full bg-transparent text-xs text-white placeholder-slate-600 outline-none"
                                        placeholder="Add a new focus task..."
                                    />
                                    <button
                                        onClick={handleCreateTask}
                                        disabled={!newTaskText.trim()}
                                        className="text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-0 disabled:pointer-events-none text-white px-2 py-0.5 rounded transition-all"
                                    >
                                        ADD
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#151A25] p-6 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-[#2E1065] flex items-center justify-center text-[#A78BFA] border border-[#8B5CF6]/20"><i className="fa-solid fa-bullseye"></i></div>
                            <h2 className="text-lg font-bold text-white">Profit Goals</h2>
                        </div>
                        <i className="fa-solid fa-ellipsis text-slate-600 cursor-pointer hover:text-white" onClick={() => onNavigateToPlaybook('goals-risk')}></i>
                    </div>

                    <div className="space-y-6">
                        <GoalBar label="Daily Target" current={dailyGoal.pnl} targetAmount={dailyGoal.targetAmount} percentage={dailyGoal.pct} targetPct={dailyGoal.target} />
                        <GoalBar label="Weekly Target" current={weeklyGoal.pnl} targetAmount={weeklyGoal.targetAmount} percentage={weeklyGoal.pct} targetPct={weeklyGoal.target} />
                        <GoalBar label="Monthly Target" current={monthlyGoal.pnl} targetAmount={monthlyGoal.targetAmount} percentage={monthlyGoal.pct} targetPct={monthlyGoal.target} />
                    </div>
                </div>
            </div>

            {/* --- ROW 4: Recent Activity & Risk --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#151A25] p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-white">Recent Activity</h2>
                        <button onClick={() => onViewChange('analytics')} className="text-xs font-bold text-[#A78BFA] hover:text-white transition-colors uppercase tracking-wider">View All</button>
                    </div>

                    <div className="space-y-3">
                        {recentTrades.map((trade) => {
                            const isWin = (trade.pnl || 0) > 0;

                            // Derive missing values for display (common in CSV imports)
                            const displayedExitPrice = trade.exitPrice || (
                                trade.status === TradeStatus.CLOSED && trade.quantity > 0
                                    ? (trade.side === TradeSide.LONG ? trade.entryPrice + ((trade.pnl || 0) / trade.quantity) : trade.entryPrice - ((trade.pnl || 0) / trade.quantity))
                                    : trade.entryPrice
                            );

                            const displayedROI = trade.pnlPercentage || (
                                (trade.entryPrice > 0 && trade.quantity > 0) ? ((trade.pnl || 0) / (trade.entryPrice * trade.quantity)) * 100 : 0
                            );

                            return (
                                <div key={trade.id} onClick={() => setViewTrade(trade)} className="flex items-center justify-between p-4 rounded-xl bg-[#0B0E14] border border-slate-800/50 hover:border-slate-700 transition-colors group cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg ${isWin ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            <i className={`fa-solid fa-arrow-${isWin ? 'trend-up' : 'trend-down'}`}></i>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">{trade.symbol}</h4>
                                            <div className="flex flex-col">
                                                <p className="text-[10px] text-slate-500">{new Date(trade.entryDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                                                <p className="text-[10px] text-slate-600 font-mono">{new Date(trade.entryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden md:block text-center">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Entry / Exit</p>
                                        <p className="text-xs font-mono text-slate-300">
                                            {trade.entryPrice.toLocaleString()} <span className="text-slate-600">→</span> {displayedExitPrice.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <span className={`hidden sm:inline-block px-3 py-1 rounded text-[10px] font-bold uppercase border ${isWin ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/5 border-rose-500/20 text-rose-500'}`}>{isWin ? 'WIN' : 'LOSS'}</span>
                                        <div className="text-right w-24">
                                            <p className={`text-sm font-bold font-mono ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>{isWin ? '+' : ''}{trade.pnl?.toFixed(2)}</p>
                                            <p className={`text-[10px] font-bold ${isWin ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>{isWin ? '+' : ''}{displayedROI.toFixed(2)}%</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {recentTrades.length === 0 && <div className="text-center py-8 text-slate-500 text-sm italic">No closed trades yet.</div>}
                    </div>
                </div>

                <div className={`rounded-2xl border border-slate-800 bg-[#151A25] p-6 flex flex-col relative overflow-hidden ${isTradingBlocked ? 'ring-1 ring-rose-500/50' : ''}`}>
                    {isTradingBlocked && <div className="absolute inset-0 bg-rose-500/5 pointer-events-none animate-pulse"></div>}
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${isTradingBlocked ? 'bg-rose-500 text-white border-rose-600' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                                <i className="fa-solid fa-shield-halved"></i>
                            </div>
                            <h2 className="text-lg font-bold text-white">Risk Status</h2>
                        </div>
                        <button onClick={() => onNavigateToPlaybook('goals-risk')} className="text-slate-600 hover:text-white transition-colors"><i className="fa-solid fa-gear"></i></button>
                    </div>

                    <div className="bg-[#0B0E14] rounded-xl border border-slate-800 p-4 mb-6 flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Risk Per Trade</p>
                            <p className="text-2xl font-bold text-white font-mono">{riskSettings.maxRiskPerTrade}% <span className="text-slate-600 text-sm">/ ${((portfolioBalance * riskSettings.maxRiskPerTrade) / 100).toFixed(0)}</span></p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><i className="fa-solid fa-check"></i></div>
                    </div>

                    <div className="space-y-6 flex-1 relative z-10">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Drawdown Limits</p>
                        <div>
                            <div className="flex justify-between text-xs mb-2">
                                <span className="text-white">Daily DD</span>
                                <span className="text-slate-400 font-mono">{riskMetrics.dailyDD.toFixed(1)}% <span className={`ml-1 font-bold ${riskMetrics.dailyDD > riskSettings.dailyDD ? 'text-rose-500' : 'text-rose-500/50'}`}>/ {riskSettings.dailyDD}%</span></span>
                            </div>
                            <div className="h-1.5 w-full bg-[#0B0E14] rounded-full overflow-hidden">
                                <div style={{ width: `${Math.min(riskMetrics.dailyDD / (riskSettings.dailyDD || 1) * 100, 100)}%` }} className={`h-full rounded-full ${riskMetrics.dailyDD >= riskSettings.dailyDD ? 'bg-rose-500' : 'bg-slate-200'}`}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-2">
                                <span className="text-white">Max DD</span>
                                <span className="text-slate-400 font-mono">{riskMetrics.maxDD.toFixed(1)}% <span className={`ml-1 font-bold ${riskMetrics.maxDD > riskSettings.monthlyDD ? 'text-rose-500' : 'text-rose-500/50'}`}>/ {riskSettings.monthlyDD}%</span></span>
                            </div>
                            <div className="h-1.5 w-full bg-[#0B0E14] rounded-full overflow-hidden">
                                <div style={{ width: `${Math.min(riskMetrics.maxDD / (riskSettings.monthlyDD || 1) * 100, 100)}%` }} className="h-full bg-slate-200 rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-slate-800 flex justify-between items-center relative z-10">
                        <span className="text-xs text-slate-500 font-bold">Trade Frequency (Today)</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-white mr-1">{riskMetrics.tradesTodayCount} trades</span>
                            <span className={`text-[10px] font-bold bg-[#1E2330] px-2 py-1 rounded border ${freqStatus.color} ${freqStatus.border}`}>
                                {freqStatus.label}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- VIEW TRADE MODAL --- */}
            {viewTrade && (
                <TradeDetailsModal
                    trade={viewTrade}
                    onClose={() => setViewTrade(null)}
                    baseCurrency={baseCurrency}
                    userFees={userFees}
                />
            )}

            {/* --- COMPREHENSIVE EXIT MODAL --- */}
            {showExitModal && selectedExitTrade && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-[#0B0E14] rounded-2xl border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between border-b border-slate-800 p-6 bg-[#151A25] shrink-0 rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    Execute Exit Protocol <span className="text-slate-500 text-sm">|</span> <span className="text-[#A78BFA] font-mono">{selectedExitTrade.symbol}</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Review your plan, log your psychology, and execute.</p>
                            </div>
                            <button onClick={() => setShowExitModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[#0B0E14]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exit Price</label>
                                        <button onClick={fetchCurrentPriceForExit} disabled={isFetchingExitPrice} className="text-[10px] font-bold text-indigo-400 hover:text-white flex items-center gap-1 transition-colors">{isFetchingExitPrice ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-bolt"></i>} Fetch Current</button>
                                    </div>
                                    <input type="number" value={exitForm.price} onChange={(e) => setExitForm({ ...exitForm, price: e.target.value })} className="w-full bg-[#151A25] border border-slate-700 rounded-lg px-4 py-3 text-white font-mono focus:border-indigo-500 outline-none" autoFocus />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exit Date</label>
                                    <input type="datetime-local" value={exitForm.date} onChange={(e) => setExitForm({ ...exitForm, date: e.target.value })} className="w-full bg-[#151A25] border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none [color-scheme:dark]" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Execution Quality</label>
                                <div className="flex gap-2 items-center">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setExitForm({ ...exitForm, quality: star })}
                                            className="p-1 transition-transform hover:scale-110 focus:outline-none"
                                        >
                                            <i className={`text-xl fa-star ${star <= exitForm.quality ? 'fa-solid text-yellow-400' : 'fa-regular text-slate-600'}`}></i>
                                        </button>
                                    ))}
                                    <span className="ml-2 text-xs text-slate-400">
                                        {exitForm.quality > 0 ? `${exitForm.quality} Star${exitForm.quality > 1 ? 's' : ''}` : 'Rate execution'}
                                    </span>
                                </div>
                            </div>

                            {/* --- TAG INPUTS (NEW) --- */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exit Reasons</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={exitReasonInput}
                                            onChange={(e) => setExitReasonInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addExitTag(exitReasonInput, 'reasons', setExitReasonInput)}
                                            placeholder="Add reason..."
                                            className="w-full bg-[#151A25] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                                        />
                                        <button onClick={() => addExitTag(exitReasonInput, 'reasons', setExitReasonInput)} className="px-3 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700"><i className="fa-solid fa-plus"></i></button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {exitForm.reasons.map((tag, i) => (
                                            <span key={i} className={getTagStyles(tag)}>
                                                {tag} <i className="fa-solid fa-xmark cursor-pointer hover:text-white" onClick={() => removeExitTag(tag, 'reasons')}></i>
                                            </span>
                                        ))}
                                        {/* Suggestions */}
                                        {availableTags['exit']?.slice(0, 3).map(t => !exitForm.reasons.includes(t.name) && (
                                            <button key={t.id} type="button" onClick={() => addExitTag(t.name, 'reasons', setExitReasonInput)} className={`${getTagStyles(t.name)} opacity-60 hover:opacity-100`}>+ {t.name}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mental State</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={exitMentalInput}
                                            onChange={(e) => setExitMentalInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addExitTag(exitMentalInput, 'mental', setExitMentalInput)}
                                            placeholder="How do you feel?"
                                            className="w-full bg-[#151A25] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                                        />
                                        <button onClick={() => addExitTag(exitMentalInput, 'mental', setExitMentalInput)} className="px-3 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700"><i className="fa-solid fa-plus"></i></button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {exitForm.mental.map((tag, i) => (
                                            <span key={i} className={getTagStyles(tag)}>
                                                {tag} <i className="fa-solid fa-xmark cursor-pointer hover:text-white" onClick={() => removeExitTag(tag, 'mental')}></i>
                                            </span>
                                        ))}
                                        {/* Mental Suggestions */}
                                        {availableTags['mental']?.slice(0, 3).map(t => !exitForm.mental.includes(t.name) && (
                                            <button key={t.id} type="button" onClick={() => addExitTag(t.name, 'mental', setExitMentalInput)} className={`${getTagStyles(t.name)} opacity-60 hover:opacity-100`}>+ {t.name}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* GENERAL TAGS */}
                                <div className="space-y-2 md:col-span-2 lg:col-span-1 md:col-start-1 lg:col-auto">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">General Tags</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={exitGeneralInput}
                                            onChange={(e) => setExitGeneralInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addExitTag(exitGeneralInput, 'general', setExitGeneralInput)}
                                            placeholder="Add context..."
                                            className="w-full bg-[#151A25] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                                        />
                                        <button onClick={() => addExitTag(exitGeneralInput, 'general', setExitGeneralInput)} className="px-3 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700"><i className="fa-solid fa-plus"></i></button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {exitForm.general.map((tag, i) => (
                                            <span key={i} className={getTagStyles(tag)}>
                                                {tag} <i className="fa-solid fa-xmark cursor-pointer hover:text-white" onClick={() => removeExitTag(tag, 'general')}></i>
                                            </span>
                                        ))}
                                        {/* General Suggestions */}
                                        {availableTags['general']?.slice(0, 3).map(t => !exitForm.general.includes(t.name) && (
                                            <button key={t.id} type="button" onClick={() => addExitTag(t.name, 'general', setExitGeneralInput)} className={`${getTagStyles(t.name)} opacity-60 hover:opacity-100`}>+ {t.name}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* --- EXIT CHECKLIST (NEW) --- */}
                            {activeStrategyObj && (activeStrategyObj.exitRules.primary.length > 0 || activeStrategyObj.exitRules.secondary.length > 0) && (
                                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5 space-y-4 animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <i className="fa-solid fa-clipboard-check text-indigo-400"></i>
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{activeStrategyObj.name} Exit Rules</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {activeStrategyObj.exitRules.primary.length > 0 && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Mandatory</label>
                                                {activeStrategyObj.exitRules.primary.map((rule, idx) => {
                                                    const isChecked = exitForm.checklist.includes(rule);
                                                    return (
                                                        <div
                                                            key={`p-${idx}`}
                                                            onClick={() => {
                                                                setExitForm(prev => ({
                                                                    ...prev,
                                                                    checklist: isChecked ? prev.checklist.filter(r => r !== rule) : [...prev.checklist, rule]
                                                                }));
                                                            }}
                                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-indigo-500/20 border-indigo-500/50 text-white' : 'bg-[#0B0E14] border-slate-800 text-slate-400 hover:border-slate-600'
                                                                }`}
                                                        >
                                                            <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                                                                {isChecked && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                                                            </div>
                                                            <span className="text-xs font-medium">{rule}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {activeStrategyObj.exitRules.secondary.length > 0 && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Optional</label>
                                                {activeStrategyObj.exitRules.secondary.map((rule, idx) => {
                                                    const isChecked = exitForm.checklist.includes(rule);
                                                    return (
                                                        <div
                                                            key={`s-${idx}`}
                                                            onClick={() => {
                                                                setExitForm(prev => ({
                                                                    ...prev,
                                                                    checklist: isChecked ? prev.checklist.filter(r => r !== rule) : [...prev.checklist, rule]
                                                                }));
                                                            }}
                                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-emerald-500/20 border-emerald-500/50 text-white' : 'bg-[#0B0E14] border-slate-800 text-slate-400 hover:border-slate-600'
                                                                }`}
                                                        >
                                                            <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                                                                {isChecked && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                                                            </div>
                                                            <span className="text-xs font-medium">{rule}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exit Notes</label>
                                <textarea value={exitForm.notes} onChange={(e) => setExitForm({ ...exitForm, notes: e.target.value })} className="w-full bg-[#151A25] border border-slate-700 rounded-lg px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none resize-none h-24 placeholder-slate-600"></textarea>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-[#151A25] rounded-b-2xl flex justify-end gap-3">
                            <button onClick={() => setShowExitModal(false)} className="px-6 py-2.5 rounded-lg border border-slate-700 text-slate-300 font-bold text-sm hover:text-white hover:bg-slate-800 transition-colors">Cancel</button>
                            <button
                                onClick={handleConfirmExit}
                                disabled={!exitForm.price || (!!activeStrategyObj && (activeStrategyObj.exitRules.primary || []).length > 0 && !(activeStrategyObj.exitRules.primary || []).every(r => exitForm.checklist.includes(r)))}
                                title={(!exitForm.price ? "Enter exit price" : (!!activeStrategyObj && (activeStrategyObj.exitRules.primary || []).length > 0 && !(activeStrategyObj.exitRules.primary || []).every(r => exitForm.checklist.includes(r))) ? "Complete all mandatory exit rules" : "Confirm Exit")}
                                className="px-8 py-2.5 rounded-lg bg-rose-600 text-white font-bold text-sm shadow-lg hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                <i className="fa-solid fa-check"></i> Confirm Exit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const NavCard: React.FC<{
    title: string;
    subtitle: string;
    icon: string;
    gradient: string;
    iconBg: string;
    onClick: () => void;
}> = ({ title, subtitle, icon, gradient, iconBg, onClick }) => (
    <button
        onClick={onClick}
        className={`relative overflow-hidden rounded-2xl border p-6 text-left transition-all hover:scale-[1.02] hover:shadow-2xl group ${gradient}`}
    >
        <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
            <i className={`fa-solid ${icon} text-xl`}></i>
        </div>
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        <p className="text-xs font-medium text-inherit opacity-70">{subtitle}</p>
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <i className="fa-solid fa-arrow-right text-white/20 -rotate-45"></i>
        </div>
    </button>
);

const ActivePositionCard: React.FC<{
    trade: Trade;
    baseCurrency: string;
    onClose: (trade: Trade, currentPrice?: number) => void;
    onAutoClose?: (trade: Trade, price: number, reason: string) => void;
    onPnlUpdate?: (tradeId: string, pnl: number) => void;
}> = ({ trade, baseCurrency, onClose, onAutoClose, onPnlUpdate }) => {
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [isAutoClosing, setIsAutoClosing] = useState(false);
    const currency = getCurrencyFormatter(baseCurrency);

    // Fetch price periodically or on mount
    useEffect(() => {
        let isMounted = true;
        const fetchPrice = async () => {
            try {
                let normalizedSymbol = trade.symbol.toUpperCase().replace('/', '');
                const isPair = normalizedSymbol.endsWith('USDT') || normalizedSymbol.endsWith('USDC') || normalizedSymbol.endsWith('BUSD') || (normalizedSymbol.length > 4 && (normalizedSymbol.endsWith('BTC') || normalizedSymbol.endsWith('ETH')));
                if (!isPair) normalizedSymbol += 'USDT';

                const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${normalizedSymbol}`);
                if (!response.ok) {
                    // Try alternative pair if primary fails (some symbols might be listed as BTCUSDT vs BTCBTC)
                    if (normalizedSymbol.endsWith('USDT')) {
                        const altSymbol = normalizedSymbol.replace('USDT', 'BUSD');
                        const altResp = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${altSymbol}`);
                        const altData = await altResp.json();
                        if (altData.price && isMounted) {
                            processPrice(parseFloat(altData.price));
                            return;
                        }
                    }
                    throw new Error(`Price fetch failed for ${normalizedSymbol}`);
                }
                const data = await response.json();
                if (data.price && isMounted) {
                    processPrice(parseFloat(data.price));
                }
            } catch (err) {
                console.error("Price fetch error:", err);
                // Fallback to entry price to stop infinite loading spinner if API is down
                if (isMounted && currentPrice === null) {
                    setCurrentPrice(trade.entryPrice);
                }
            }
        };

        const processPrice = (price: number) => {
            setCurrentPrice(price);

            let pnl = 0;
            if (trade.side === TradeSide.LONG) {
                pnl = (price - trade.entryPrice) * trade.quantity;
            } else {
                pnl = (trade.entryPrice - price) * trade.quantity;
            }
            if (onPnlUpdate) onPnlUpdate(trade.id, pnl);

            if (onAutoClose && trade.status === 'OPEN' && !isAutoClosing) {
                let hitReason = '';
                let liqPrice = 0;
                if (trade.side === TradeSide.LONG) liqPrice = trade.entryPrice * (1 - (1 / trade.leverage) + 0.005);
                else liqPrice = trade.entryPrice * (1 + (1 / trade.leverage) - 0.005);

                if (trade.side === TradeSide.LONG) {
                    if (trade.stopLoss && price <= trade.stopLoss) hitReason = 'Stop Loss';
                    else if (trade.takeProfit && price >= trade.takeProfit) hitReason = 'Take Profit';
                    else if (price <= liqPrice) hitReason = 'Liquidation';
                } else {
                    if (trade.stopLoss && price >= trade.stopLoss) hitReason = 'Stop Loss';
                    else if (trade.takeProfit && price <= trade.takeProfit) hitReason = 'Take Profit';
                    else if (price >= liqPrice) hitReason = 'Liquidation';
                }

                if (hitReason) {
                    setIsAutoClosing(true);
                    onAutoClose(trade, price, hitReason);
                }
            }
        };
        fetchPrice();
        const interval = setInterval(fetchPrice, 5000);
        return () => { isMounted = false; clearInterval(interval); };
    }, [trade, isAutoClosing, onPnlUpdate, onAutoClose]);

    const calculateUnrealizedPnL = () => {
        if (!currentPrice) return { pnl: 0, roe: 0 };
        let pnl = 0;
        if (trade.side === TradeSide.LONG) {
            pnl = (currentPrice - trade.entryPrice) * trade.quantity;
        } else {
            pnl = (trade.entryPrice - currentPrice) * trade.quantity;
        }
        const roe = (pnl / trade.capital) * 100;
        return { pnl, roe };
    };

    const { pnl, roe } = calculateUnrealizedPnL();
    const isWin = pnl >= 0;
    const sideColor = trade.side === TradeSide.LONG ? 'text-emerald-400' : 'text-rose-400';
    const glowShadow = trade.side === TradeSide.LONG ? 'shadow-[0_0_30px_rgba(16,185,129,0.1)] hover:shadow-[0_0_40px_rgba(16,185,129,0.2)]' : 'shadow-[0_0_30px_rgba(244,63,94,0.1)] hover:shadow-[0_0_40px_rgba(244,63,94,0.2)]';
    const borderColor = trade.side === TradeSide.LONG ? 'border-emerald-500/30 hover:border-emerald-500/60' : 'border-rose-500/30 hover:border-rose-500/60';
    const dotPulse = trade.side === TradeSide.LONG ? 'bg-emerald-500' : 'bg-rose-500';

    return (
        <div className={`relative overflow-visible rounded-2xl border bg-[#0B0E14] p-6 transition-all duration-300 group ${borderColor} ${glowShadow}`}>

            {/* Dynamic Close Button (Absolute Top Right) */}
            <button
                onClick={() => onClose(trade, currentPrice || undefined)}
                disabled={isAutoClosing}
                className={`absolute -top-3 -right-3 h-8 w-8 rounded-full border-2 bg-[#0B0E14] flex items-center justify-center cursor-pointer transition-all duration-300 z-50 shadow-xl
                    ${isAutoClosing
                        ? 'border-indigo-500 text-indigo-500'
                        : 'border-rose-500/40 text-rose-500 hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:scale-110 hover:rotate-90'
                    }`}
                title="Close Position"
            >
                {isAutoClosing ? <i className="fa-solid fa-spinner fa-spin text-xs"></i> : <i className="fa-solid fa-xmark text-sm font-bold"></i>}
            </button>

            {/* Pulsing Body Border Effect */}
            <div className={`absolute inset-0 rounded-2xl pointer-events-none opacity-20 animate-pulse ${trade.side === TradeSide.LONG ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}></div>

            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${trade.side === TradeSide.LONG ? 'via-emerald-500' : 'via-rose-500'} to-transparent opacity-30 animate-scan`}></div>
            </div>

            {/* Background Texture/Icon */}
            <div className="absolute right-[-20px] top-[-20px] text-[200px] opacity-[0.02] pointer-events-none rotate-12">
                <i className="fa-brands fa-bitcoin"></i>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10 items-center">
                {/* 1. Asset & Side (Col 1-4) - Symbol Pulsing */}
                <div className="md:col-span-4 flex items-center gap-5">
                    <div className={`h-16 w-16 rounded-full bg-[#151A25] border-2 flex items-center justify-center text-white font-bold text-2xl shadow-xl relative ${trade.side === TradeSide.LONG ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                        {trade.symbol.substring(0, 3)}
                        <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-[#0B0E14] animate-bounce ${dotPulse}`}></div>
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-black text-white tracking-wide leading-none group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-all duration-500">{trade.symbol}</h3>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-800/50 border border-slate-700 px-1.5 py-0.5 rounded">PERP</span>
                        </div>
                        <div className={`flex items-center gap-3 text-sm font-bold mt-1 ${sideColor}`}>
                            <span className="flex items-center gap-1"><i className={`fa-solid ${trade.side === TradeSide.LONG ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i> {trade.side}</span>
                            <span className="text-slate-500 font-mono text-xs bg-[#151A25] px-2 rounded border border-slate-800">{trade.leverage}x Leverage</span>
                        </div>
                    </div>
                </div>

                {/* 2. Prices & Context (Col 5-8) */}
                <div className="md:col-span-4 flex items-center justify-center">
                    <div className="flex w-full items-center justify-between bg-[#151A25]/50 p-3 rounded-xl border border-slate-800/50 backdrop-blur-sm transition-colors group-hover:bg-[#151A25]/80">
                        <div className="px-2 text-center">
                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Entry</span>
                            <span className="font-mono text-base text-white">{trade.entryPrice}</span>
                        </div>

                        <div className="flex flex-col items-center px-4">
                            <i className="fa-solid fa-arrow-right-long text-slate-600"></i>
                        </div>

                        <div className="px-2 text-center">
                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mark</span>
                            <span className={`font-mono text-base font-bold ${currentPrice && ((trade.side === 'LONG' && currentPrice > trade.entryPrice) || (trade.side === 'SHORT' && currentPrice < trade.entryPrice)) ? 'text-emerald-400' : 'text-slate-200'}`}>
                                {currentPrice || <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. PnL & Action (Col 9-12) - Close button removed, PnL takes space */}
                <div className="md:col-span-4 flex items-center justify-end gap-6 pl-4 border-l border-slate-800/50">
                    <div className="text-right">
                        <div className={`text-5xl font-black tracking-tighter leading-none mb-1 transition-all duration-300 transform group-hover:scale-105 ${isWin ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.25)]' : 'text-rose-400 drop-shadow-[0_0_15px_rgba(251,113,133,0.25)]'}`}>
                            {roe > 0 ? '+' : ''}{roe.toFixed(2)}%
                        </div>
                        <div className={`text-sm font-bold font-mono ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {pnl > 0 ? '+' : ''}{currency.format(pnl)}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`absolute bottom-0 left-0 h-[3px] w-full ${trade.side === TradeSide.LONG ? 'bg-emerald-500' : 'bg-rose-500'} opacity-50`}></div>
        </div>
    );
};

const GoalBar: React.FC<{
    label: string;
    current: number;
    targetAmount: number;
    percentage: number;
    targetPct: number;
}> = ({ label, current, targetAmount, percentage, targetPct }) => {
    const progress = targetAmount > 0 ? (current / targetAmount) * 100 : 0;
    const visualPct = Math.min(Math.max(progress, 0), 100);
    const isTargetMet = progress >= 100;

    return (
        <div>
            <div className="flex justify-between items-end mb-2">
                <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                    <p className="text-xs text-slate-500 mt-0.5">Target: {targetPct}% (${targetAmount.toFixed(0)})</p>
                </div>
                <div className="text-right">
                    <span className={`text-sm font-bold font-mono ${isTargetMet ? 'text-emerald-400' : 'text-white'}`}>
                        {current >= 0 ? '+' : ''}{current.toFixed(2)}
                    </span>
                    <span className={`text-xs font-bold ml-2 ${isTargetMet ? 'text-emerald-500' : 'text-slate-500'}`}>
                        {progress.toFixed(1)}%
                    </span>
                </div>
            </div>
            <div className="h-2 w-full bg-[#0B0E14] rounded-full overflow-hidden border border-slate-800/50">
                <div
                    style={{ width: `${visualPct}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${isTargetMet
                        ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                        : 'bg-indigo-600'
                        }`}
                ></div>
            </div>
        </div>
    );
};

const JournalStreakCard: React.FC<{
    streak: number;
    onClick: () => void;
}> = ({ streak, onClick }) => (
    <button
        onClick={onClick}
        className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#151A25] p-6 text-left transition-all hover:scale-[1.02] hover:shadow-2xl group hover:border-amber-500/40"
    >
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-amber-500/20 transition-all"></div>

        <div className="flex justify-between items-start">
            <div>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-book-journal-whills text-xl"></i>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Journal Streak</h3>
                <p className="text-xs font-medium text-slate-400">Consistency is key</p>
            </div>
            <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                    <i className={`fa-solid fa-fire text-2xl ${streak > 0 ? 'text-orange-500 animate-pulse' : 'text-slate-700'}`}></i>
                    <span className={`text-4xl font-black ${streak > 0 ? 'text-white' : 'text-slate-600'}`}>{streak}</span>
                </div>
                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mt-1 opacity-80">Days</p>
            </div>
        </div>

        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <i className="fa-solid fa-arrow-right text-white/20 -rotate-45"></i>
        </div>
    </button>
);

export default Dashboard;
