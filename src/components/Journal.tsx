
import React, { useState, useMemo, useEffect } from 'react';
import { Trade, JournalEntry } from '../types';

interface JournalProps {
    trades: Trade[];
    entries: JournalEntry[];
    onSaveEntry: (entry: JournalEntry) => void;
    onViewAnalytics: (date: string, type: 'Daily' | 'Weekly' | 'Monthly') => void;
}

const Journal: React.FC<JournalProps> = ({ trades, entries, onSaveEntry, onViewAnalytics }) => {
    const [activeTab, setActiveTab] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Form State
    const [formContent, setFormContent] = useState({
        marketObservations: '',
        selfReflection: '',
        lessonsLearned: ''
    });

    const [isSaved, setIsSaved] = useState(false);

    // Load entry when date or tab changes
    useEffect(() => {
        const entry = entries.find(e => e.date === selectedDate && e.type === activeTab);
        if (entry) {
            setFormContent(entry.content);
        } else {
            setFormContent({
                marketObservations: '',
                selfReflection: '',
                lessonsLearned: ''
            });
        }
        setIsSaved(false);
    }, [selectedDate, activeTab, entries]);

    const handleSave = () => {
        onSaveEntry({
            id: `${activeTab}-${selectedDate}`,
            date: selectedDate,
            type: activeTab,
            content: formContent
        });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    // Streak Calculation
    const streakStats = useMemo(() => {
        const dailyEntries = entries
            .filter(e => e.type === 'Daily')
            .map(e => e.date)
            // Sort ascending for easy gap checking
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        const uniqueDates = Array.from(new Set(dailyEntries));
        if (uniqueDates.length === 0) return { current: 0, longest: 0, total: 0 };

        // 1. Calculate Longest Streak
        let longest = 1;
        let temp = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
            const prev = new Date(uniqueDates[i - 1]);
            const curr = new Date(uniqueDates[i]);
            const diffTime = Math.abs(curr.getTime() - prev.getTime());
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // Use round to avoid DST issues

            if (diffDays === 1) {
                temp++;
            } else {
                temp = 1;
            }
            if (temp > longest) longest = temp;
        }

        // 2. Calculate Current Streak
        let current = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Check if streak is alive
        const hasToday = uniqueDates.includes(todayStr);
        const hasYesterday = uniqueDates.includes(yesterdayStr);

        if (!hasToday && !hasYesterday) {
            current = 0;
        } else {
            // We have a live streak. Start counting backwards.
            // If we have today, start from today. If only yesterday, start from yesterday.
            let checkDate = new Date(hasToday ? today : yesterday);
            current = 0;

            // Loop backwards through uniqueDates
            // Efficient approach: verify existence of date string in set
            while (true) {
                const checkStr = checkDate.toISOString().split('T')[0];
                if (uniqueDates.includes(checkStr)) {
                    current++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        return { current, longest, total: uniqueDates.length };
    }, [entries]);

    // Group entries for the sidebar
    const historyList = useMemo(() => {
        return entries
            .filter(e => e.type === activeTab)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [entries, activeTab]);

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 pb-12">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                            <i className="fa-solid fa-book-open text-indigo-400"></i>
                        </div>
                        <h1 className="text-3xl font-bold text-white">Journal</h1>
                    </div>
                    <p className="text-slate-400 pl-[52px]">Reflect, learn, and evolve. Consistent journaling is the key to mastery.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)] min-h-[600px]">

                {/* Sidebar: History */}
                <div className="rounded-2xl border border-slate-800 bg-[#151A25] p-4 flex flex-col overflow-hidden">

                    {/* Streak Card */}
                    {(() => {
                        const { current, longest, total } = streakStats;

                        // Determine Streak Level Styles
                        let streakStyles = {
                            color: 'text-amber-500',
                            bgGradient: 'from-amber-500/20 to-transparent',
                            borderColor: 'border-amber-500/30',
                            shadow: 'shadow-amber-500/20',
                            iconAnim: current > 0 ? 'animate-pulse' : '',
                            barGradient: 'from-amber-500 to-yellow-500'
                        };

                        if (current >= 100) {
                            streakStyles = {
                                color: 'text-purple-500',
                                bgGradient: 'from-purple-500/20 to-purple-900/20',
                                borderColor: 'border-purple-500/50',
                                shadow: 'shadow-[0_0_30px_rgba(168,85,247,0.4)]',
                                iconAnim: 'animate-bounce',
                                barGradient: 'from-purple-500 to-fuchsia-500'
                            };
                        } else if (current >= 50) {
                            streakStyles = {
                                color: 'text-blue-500',
                                bgGradient: 'from-blue-500/20 to-cyan-900/20',
                                borderColor: 'border-blue-500/50',
                                shadow: 'shadow-[0_0_25px_rgba(59,130,246,0.4)]',
                                iconAnim: 'animate-pulse duration-75',
                                barGradient: 'from-blue-500 to-cyan-400'
                            };
                        } else if (current >= 25) {
                            streakStyles = {
                                color: 'text-rose-500',
                                bgGradient: 'from-rose-500/20 to-red-900/20',
                                borderColor: 'border-rose-500/50',
                                shadow: 'shadow-[0_0_20px_rgba(244,63,94,0.4)]',
                                iconAnim: 'animate-pulse',
                                barGradient: 'from-rose-500 to-red-500'
                            };
                        } else if (current >= 10) {
                            streakStyles = {
                                color: 'text-orange-500',
                                bgGradient: 'from-orange-500/20 to-amber-900/20',
                                borderColor: 'border-orange-500/50',
                                shadow: 'shadow-[0_0_15px_rgba(249,115,22,0.3)]',
                                iconAnim: 'animate-pulse',
                                barGradient: 'from-orange-500 to-amber-500'
                            };
                        }

                        return (
                            <div className={`mb-6 p-4 rounded-xl bg-gradient-to-br from-[#1E2330] to-[#0B0E14] border ${streakStyles.borderColor} shadow-lg relative overflow-hidden group transition-all duration-500 ${current >= 10 ? streakStyles.shadow : ''}`}>
                                {/* Dynamic ambient glow */}
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${streakStyles.bgGradient} blur-2xl opacity-20 rounded-full -mr-10 -mt-10 pointer-events-none`}></div>

                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <i className={`fa-solid fa-fire text-6xl ${streakStyles.color}`}></i>
                                </div>

                                <div className="relative z-10 flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consistency</span>
                                    {current > 0 && <i className={`fa-solid fa-fire ${streakStyles.color} ${streakStyles.iconAnim}`}></i>}
                                </div>

                                <div className="relative z-10 flex items-baseline gap-2 mb-4">
                                    <span className={`text-3xl font-bold font-mono ${streakStyles.color}`}>{current}</span>
                                    <span className="text-xs text-slate-500 font-bold uppercase">Day Streak</span>
                                </div>

                                <div className="relative z-10 h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden mb-3">
                                    {/* Progress bar logic: cap at 7 days for visual, or milestones for higher */}
                                    <div style={{ width: `${Math.min((current / (current < 10 ? 7 : (current < 25 ? 25 : (current < 50 ? 50 : 100)))) * 100, 100)}%` }} className={`h-full bg-gradient-to-r ${streakStyles.barGradient} rounded-full`}></div>
                                </div>

                                <div className="relative z-10 flex justify-between text-[10px] text-slate-500 font-medium">
                                    <span>Best: <strong className="text-slate-300">{longest}</strong></span>
                                    <span>Total: <strong className="text-slate-300">{total}</strong></span>
                                </div>
                            </div>
                        );
                    })()}

                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Journal Type</h3>
                        <div className="flex rounded-lg bg-[#0F1218] border border-slate-800 p-1">
                            {['Daily', 'Weekly', 'Monthly'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`flex-1 flex items-center justify-center rounded-md py-1.5 text-xs font-bold transition-all ${activeTab === tab
                                        ? 'bg-[#1E2330] text-white shadow-sm ring-1 ring-white/5'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 sticky top-0 bg-[#151A25] py-2">Past Entries</h3>

                        {historyList.map(entry => (
                            <button
                                key={entry.id}
                                onClick={() => setSelectedDate(entry.date)}
                                className={`w-full text-left p-3 rounded-xl border transition-all ${selectedDate === entry.date
                                    ? 'bg-indigo-500/10 border-indigo-500/50 text-white'
                                    : 'bg-[#0B0E14] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold">{new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    <i className="fa-solid fa-chevron-right text-[10px] opacity-50"></i>
                                </div>
                            </button>
                        ))}

                        {historyList.length === 0 && (
                            <div className="text-center py-8 text-slate-600">
                                <i className="fa-solid fa-ghost text-2xl mb-2 opacity-30"></i>
                                <p className="text-xs">No entries yet.</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                        className="mt-4 w-full py-2 rounded-lg border border-dashed border-slate-700 text-xs font-bold text-slate-400 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-plus"></i> New Entry for Today
                    </button>
                </div>

                {/* Main Editor */}
                <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-[#151A25] flex flex-col overflow-hidden">

                    {/* Toolbar */}
                    <div className="flex items-center justify-between border-b border-slate-800 p-6 bg-[#151A25]">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {activeTab} Entry
                                <span className="text-slate-500 text-base font-normal">|</span>
                                <span className="text-indigo-400 font-mono">{selectedDate}</span>
                            </h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-[#0B0E14] border border-slate-700 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                            />
                            <div className="h-6 w-px bg-slate-800"></div>
                            <button
                                onClick={() => onViewAnalytics(selectedDate, activeTab)}
                                className="flex items-center gap-2 rounded-lg bg-[#0B0E14] border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:text-white hover:border-indigo-500 transition-colors"
                            >
                                <i className="fa-solid fa-chart-line"></i> View Analytics
                            </button>
                            <button
                                onClick={handleSave}
                                className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold text-white shadow-lg transition-all ${isSaved
                                    ? 'bg-emerald-500 hover:bg-emerald-600'
                                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
                                    }`}
                            >
                                {isSaved ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-save"></i>}
                                {isSaved ? 'Saved!' : 'Save Entry'}
                            </button>
                        </div>
                    </div>

                    {/* Editor Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 space-y-6 bg-[#0B0E14]/50">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-white flex items-center gap-2">
                                <i className="fa-solid fa-chart-line text-blue-400"></i> Market Observations
                            </label>
                            <p className="text-xs text-slate-500 mb-2">What happened in the market? Key levels, trends, news events?</p>
                            <textarea
                                value={formContent.marketObservations}
                                onChange={(e) => setFormContent({ ...formContent, marketObservations: e.target.value })}
                                className="w-full rounded-xl border border-slate-800 bg-[#0F1218] p-4 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-all min-h-[150px] resize-none focus:ring-1 focus:ring-indigo-500/50 leading-relaxed"
                                placeholder="E.g. BTC rejected 65k resistance, strong volume on the hourly..."
                            ></textarea>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-white flex items-center gap-2">
                                <i className="fa-solid fa-brain text-purple-400"></i> Self-Reflection
                            </label>
                            <p className="text-xs text-slate-500 mb-2">How was your psychology? FOMO? Revenge trading? Calm execution?</p>
                            <textarea
                                value={formContent.selfReflection}
                                onChange={(e) => setFormContent({ ...formContent, selfReflection: e.target.value })}
                                className="w-full rounded-xl border border-slate-800 bg-[#0F1218] p-4 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-all min-h-[150px] resize-none focus:ring-1 focus:ring-indigo-500/50 leading-relaxed"
                                placeholder="E.g. Felt impatient at the open, forced a trade on ETH..."
                            ></textarea>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-white flex items-center gap-2">
                                <i className="fa-solid fa-lightbulb text-amber-400"></i> Lessons Learned
                            </label>
                            <p className="text-xs text-slate-500 mb-2">One key takeaway to improve for tomorrow.</p>
                            <textarea
                                value={formContent.lessonsLearned}
                                onChange={(e) => setFormContent({ ...formContent, lessonsLearned: e.target.value })}
                                className="w-full rounded-xl border border-slate-800 bg-[#0F1218] p-4 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-all min-h-[150px] resize-none focus:ring-1 focus:ring-indigo-500/50 leading-relaxed"
                                placeholder="E.g. Wait for candle close before entering..."
                            ></textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Journal;
