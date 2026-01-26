
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { Trade, TradeSide, TradeStatus, getCurrencyFormatter, Strategy, Tag, DateFilterState, DateFilterType, FeeConfig, TAG_COLORS } from '../types';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ComposedChart, Line, ReferenceLine, Brush, Legend, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import TradeDetailsModal from './TradeDetailsModal';

interface AnalyticsProps {
    trades: Trade[];
    baseCurrency: string;
    onImportTrades?: (trades: Trade[]) => void;
    strategies?: Strategy[];
    tags?: Record<string, Tag[]>;
    filter: DateFilterState;
    onFilterChange: (filter: DateFilterState) => void;
    onNavigateToPlaybook?: (tab: string) => void;
    userFees?: FeeConfig;
    exchangeFees?: Record<string, FeeConfig>;
    onDeleteTrades?: (ids: string[]) => void;
    onRestoreTrades?: (trades: Trade[]) => void;
    onSeekWisdom?: (data: any) => void;
}

const METRIC_DEFINITIONS: Record<string, { title: string; beginner: string; advanced: string }> = {
    'Total Trades': {
        title: 'Total Trades',
        beginner: 'The total number of closed trades that match your current filters.',
        advanced: 'Sample size is crucial. Statistical significance typically requires N > 30. Low trade counts render metrics like Win Rate and Expectancy unreliable due to high variance.'
    },
    'Profit Ratio': {
        title: 'Profit Ratio (Win Rate)',
        beginner: 'The percentage of your trades that ended in profit.',
        advanced: 'Calculated as (Winning Trades / Total Trades). High win rate strategies often have lower Risk:Reward ratios, while trend-following strategies may have lower win rates (<40%) but higher R:R.'
    },
    'Profit Factor': {
        title: 'Profit Factor',
        beginner: 'How much you make for every dollar you lose. A value above 1.5 is considered healthy.',
        advanced: 'Calculated as (Gross Profit / Gross Loss). It measures the efficiency of your system. < 1.0 means the system is losing money. > 2.0 indicates a very robust edge.'
    },
    'Expectancy': {
        title: 'Expectancy',
        beginner: 'The average amount of money you can expect to make (or lose) on every single trade.',
        advanced: 'Formula: (Win % Ã— Avg Win) - (Loss % Ã— Avg Loss). This is the pure mathematical "edge" of your system per execution, regardless of frequency.'
    },
    'Realized R:R': {
        title: 'Realized R:R (Avg Win / Avg Loss)',
        beginner: 'For every dollar lost, how many dollars do you win on average?',
        advanced: 'Formula: Average Win / Average Loss. This is your true payoff ratio. A value > 1.5 combined with a 40%+ win rate is usually a profitable edge.'
    },
    'Sharpe Ratio': {
        title: 'Sharpe Ratio',
        beginner: 'A score that compares your returns against the risk/volatility you took. Higher is better.',
        advanced: 'Calculated here as (Mean Trade PnL / Std Dev of Trade PnL). It penalizes "lumpy" returns. A system with steady small gains has a higher Sharpe than one with wild swings, even if total profit is same.'
    },
    'Avg. Win': {
        title: 'Average Win',
        beginner: 'The average profit amount of your winning trades.',
        advanced: 'Monitor this against your Average Loss. If Avg Win is decreasing over time, your edge might be eroding or market conditions are tightening.'
    },
    'Avg. Loss': {
        title: 'Average Loss',
        beginner: 'The average amount lost on losing trades.',
        advanced: 'Keep this number consistent. Large spikes in Avg Loss usually indicate emotional trading (tilt) or lack of stop-loss discipline.'
    },
    'Highest Win': {
        title: 'Highest Win',
        beginner: 'The single largest profit from a trade in this period.',
        advanced: 'Ensure your Highest Win isn\'t an outlier that skews your expectancy. If 50% of your profit comes from 1 trade, your system is fragile.'
    },
    'Highest Loss': {
        title: 'Highest Loss',
        beginner: 'The single largest loss from a trade in this period.',
        advanced: 'This is a "leak" check. Your Highest Loss should never exceed your maximum risk rules (e.g., 2% of equity). If it does, risk management failed.'
    },
    'Highest Win %': {
        title: 'Highest Win %',
        beginner: 'The biggest percentage gain on capital in a single trade.',
        advanced: 'Tracks the ROI relative to the capital allocated for that specific trade. Useful for spotting "home runs" in leverage trading.'
    },
    'Highest Loss %': {
        title: 'Highest Loss %',
        beginner: 'The biggest percentage loss on capital in a single trade.',
        advanced: 'The maximum adverse excursion realized. Ideally, this is capped by your Stop Loss. If this approaches -100%, you are risking liquidation.'
    },
    'Max Win Streak': {
        title: 'Max Win Streak',
        beginner: 'The highest number of consecutive winning trades.',
        advanced: 'Indicates strong alignment with market conditions. However, consecutive wins can lead to overconfidence. Be wary of the "hot hand" fallacy.'
    },
    'Max Loss Streak': {
        title: 'Max Loss Streak',
        beginner: 'The highest number of consecutive losing trades.',
        advanced: 'Crucial for calculating Risk of Ruin. If your strategy has a 50% win rate, losing streaks of 5-10 are statistically probable over time. Ensure your position sizing can survive this.'
    },
    'Current Streak': {
        title: 'Current Streak',
        beginner: 'Your current run of wins or losses.',
        advanced: 'Useful for managing psychology. A winning streak might signal a need for caution against euphoria, while a losing streak might signal a need to pause and review (or a "drawdown" phase of the strategy).'
    },
    'Max Drawdown': {
        title: 'Max Drawdown',
        beginner: 'The largest drop from a peak in your total profit over time.',
        advanced: 'Measured as a percentage or currency value drop from the highest equity peak to the subsequent lowest trough. This represents the pain threshold of your strategy.'
    },
    'Avg. Holding Time': {
        title: 'Avg. Holding Time',
        beginner: 'How long you typically stay in a trade.',
        advanced: 'Comparing holding times of winners vs losers can reveal psychological biases (e.g. cutting winners early, holding losers too long).'
    },
    'Return Volatility': {
        title: 'Return Volatility',
        beginner: 'How much your returns fluctuate around the average.',
        advanced: 'Measured as the standard deviation of trade returns. High volatility means unpredictable performance.'
    },
    'CAGR vs. Max DD': {
        title: 'Recovery Factor (Return / Max DD)',
        beginner: 'A ratio showing how much profit you made relative to your worst drawdown.',
        advanced: 'Often equivalent to the Calmar Ratio. Net Profit divided by Max Drawdown. A value > 2.0 suggests a very stable, low-stress growth curve.'
    },
    'Sortino Ratio': {
        title: 'Sortino Ratio',
        beginner: 'Similar to Sharpe, but only penalizes "bad" volatility (losses).',
        advanced: 'Measures risk-adjusted return using downside deviation. Useful because upside volatility (big wins) is good, unlike Sharpe which penalizes all variance.'
    },
    'Total Fees Paid': {
        title: 'Total Fees Paid',
        beginner: 'The estimated total cost of commissions for your trades.',
        advanced: 'Trading costs can significantly eat into edge, especially for scalping strategies. Ensure your expectancy accounts for this friction.'
    }
};

// --- Helper Components ---

const Card: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`rounded-2xl border border-slate-800 bg-[#151A25] p-6 shadow-sm ${className}`}>
        {title && <h3 className="text-lg font-bold text-white mb-6">{title}</h3>}
        {children}
    </div>
);

const StatCard: React.FC<{
    label: string;
    value: string;
    valueSize?: string;
    valueColor?: string;
    onInfoClick?: () => void;
}> = ({ label, value, valueSize = 'text-2xl', valueColor = 'text-white', onInfoClick }) => (
    <div className="rounded-xl border border-slate-800 bg-[#151A25] p-4 flex flex-col justify-between min-h-[100px] hover:border-slate-700 transition-colors">
        <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium text-slate-500">{label}</span>
            {onInfoClick && (
                <i onClick={onInfoClick} className="fa-regular fa-circle-question text-[10px] text-slate-600 cursor-help hover:text-white transition-colors"></i>
            )}
        </div>
        <div className={`${valueSize} font-bold ${valueColor} tracking-tight`}>{value}</div>
    </div>
);

const RiskCard: React.FC<{ label: string; value: string; valueColor?: string; sub?: string; onInfoClick?: () => void }> = ({ label, value, valueColor = 'text-white', sub, onInfoClick }) => (
    <div className="rounded-xl border border-slate-800 bg-[#0B0E14] p-4 relative flex flex-col justify-between h-24 hover:border-slate-700 transition-colors">
        <div className="flex justify-between items-start">
            <span className="text-xs text-slate-500 leading-tight">{label}</span>
            {onInfoClick && <i onClick={onInfoClick} className="fa-regular fa-circle-question text-[10px] text-slate-600 cursor-help hover:text-white transition-colors"></i>}
        </div>
        <div className={`text-lg font-bold ${valueColor}`}>
            {value} {sub && <span className="text-xs font-normal text-slate-500 ml-1">{sub}</span>}
        </div>
    </div>
);

const FilterDropdown: React.FC<{ label: string; value: string; onChange: (val: string) => void; options: string[] }> = ({ label, value, onChange, options }) => (
    <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none bg-[#0B0E14] border border-slate-800 text-white text-xs font-bold rounded-lg px-4 py-2 pr-8 outline-none focus:border-indigo-500 transition-colors min-w-[120px]">
            {options.map(opt => <option key={opt} value={opt}>{opt === 'All' ? `All ${label}s` : opt}</option>)}
        </select>
        <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none"></i>
    </div>
);

const ToggleBtn: React.FC<{ label: string; active: boolean; onClick: () => void; color: string }> = ({ label, active, onClick, color }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1 rounded-md text-[10px] font-bold border transition-all ${active ? color : 'bg-[#0B0E14] border-slate-800 text-slate-500 hover:text-slate-300'}`}
    >
        {active && <i className="fa-solid fa-check mr-1"></i>}
        {label}
    </button>
);

const TimeFragmentModal: React.FC<{ onClose: () => void; onApply: (filter: DateFilterState) => void; currentFilter: DateFilterState }> = ({ onClose, onApply, currentFilter }) => {
    const [activeType, setActiveType] = useState<DateFilterType>(currentFilter.type);
    const [days, setDays] = useState(currentFilter.days || 30);
    const [range, setRange] = useState(currentFilter.range || { start: '', end: '' });
    const handleApply = () => { if (activeType === 'RELATIVE') onApply({ type: 'RELATIVE', days }); else if (activeType === 'ABSOLUTE') onApply({ type: 'ABSOLUTE', range }); else onApply({ type: 'LIFETIME' }); };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-[#0B0E14] rounded-2xl border border-slate-800 shadow-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Time Fragment</h3>
                <div className="space-y-4">
                    <div className="flex bg-[#151A25] p-1 rounded-lg border border-slate-800">
                        {['LIFETIME', 'RELATIVE', 'ABSOLUTE'].map(t => (
                            <button key={t} onClick={() => setActiveType(t as DateFilterType)} className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-colors ${activeType === t ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
                        ))}
                    </div>
                    {activeType === 'RELATIVE' && (<div><label className="text-xs text-slate-500 font-bold block mb-2">Last {days} Days</label><input type="range" min="7" max="365" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600" /></div>)}
                    {activeType === 'ABSOLUTE' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs text-slate-500 font-bold block mb-1">Start Date</label><input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} className="w-full bg-[#151A25] border border-slate-800 rounded px-2 py-1.5 text-xs text-white" /></div>
                            <div><label className="text-xs text-slate-500 font-bold block mb-1">End Date</label><input type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} className="w-full bg-[#151A25] border border-slate-800 rounded px-2 py-1.5 text-xs text-white" /></div>
                        </div>
                    )}
                    <div className="flex gap-2 justify-end pt-2"><button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white">Cancel</button><button onClick={handleApply} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500">Apply Filter</button></div>
                </div>
            </div>
        </div>
    );
};

const MetricInfoModal: React.FC<{ data: { title: string; beginner: string; advanced: string }; onClose: () => void }> = ({ data, onClose }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-[#0B0E14] rounded-2xl border border-slate-800 shadow-2xl p-6">
            <div className="flex justify-between items-start mb-4"><h3 className="text-lg font-bold text-white">{data.title}</h3><button onClick={onClose} className="text-slate-500 hover:text-white"><i className="fa-solid fa-xmark"></i></button></div>
            <div className="space-y-4"><div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"><p className="text-xs font-bold text-emerald-400 uppercase mb-1">Beginner</p><p className="text-sm text-slate-300">{data.beginner}</p></div><div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20"><p className="text-xs font-bold text-indigo-400 uppercase mb-1">Advanced</p><p className="text-sm text-slate-300">{data.advanced}</p></div></div>
        </div>
    </div>
);

const FeeBreakdownModal: React.FC<{ feeData: { total: number; exchangeFees: Record<string, number> }; baseCurrency: string; onClose: () => void }> = ({ feeData, baseCurrency, onClose }) => {
    const data = Object.entries(feeData.exchangeFees).map(([name, value]) => ({ name, value: Number(value) }));
    const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f43f5e', '#f59e0b'];
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#0B0E14] rounded-2xl border border-slate-800 shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-white">Fee Breakdown</h3><button onClick={onClose} className="text-slate-500 hover:text-white"><i className="fa-solid fa-xmark"></i></button></div>
                <div className="h-[200px] w-full flex items-center justify-center mb-6">{data.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">{data.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip formatter={(value: number) => [`${baseCurrency}${value.toFixed(2)}`, 'Fees']} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} /></PieChart></ResponsiveContainer>) : (<div className="text-slate-500 text-sm">No fee data found.</div>)}</div>
                <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar">{data.sort((a, b) => b.value - a.value).map((item, idx) => (<div key={item.name} className="flex justify-between items-center p-3 rounded-lg bg-[#151A25] border border-slate-800"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span><span className="text-sm font-bold text-white">{item.name}</span></div><div className="text-right"><p className="text-sm font-mono text-slate-300">{baseCurrency}{item.value.toFixed(2)}</p><p className="text-[10px] text-slate-500">{((item.value / (feeData.total || 1)) * 100).toFixed(1)}%</p></div></div>))}</div>
            </div>
        </div>
    );
};

const Analytics: React.FC<AnalyticsProps> = ({
    trades, baseCurrency, onImportTrades, strategies = [], tags = {},
    filter: dateFilter, onFilterChange: setDateFilter, onNavigateToPlaybook, userFees, exchangeFees, onDeleteTrades,
    onRestoreTrades, onSeekWisdom
}) => {
    const [activeTab, setActiveTab] = useState('Analysis');
    const [deepDiveView, setDeepDiveView] = useState<'Symbol' | 'Strategy' | 'Day' | 'Hour' | 'Side'>('Symbol');
    const [viewTrade, setViewTrade] = useState<Trade | null>(null);

    // Calendar State
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [calendarViewMode, setCalendarViewMode] = useState<'Monthly' | 'Yearly'>('Monthly');

    // Filter State
    const [filterSymbol, setFilterSymbol] = useState('All');
    const [filterStrategy, setFilterStrategy] = useState('All');
    const [filterSetup, setFilterSetup] = useState('All');
    const [filterSide, setFilterSide] = useState('All');
    const [filterTag, setFilterTag] = useState('All');
    const [filterQuality, setFilterQuality] = useState('All');

    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [infoModalKey, setInfoModalKey] = useState<string | null>(null);
    const [showFeeModal, setShowFeeModal] = useState(false);

    // Bulk Delete State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedTradeIds, setSelectedTradeIds] = useState<Set<string>>(new Set());
    const [undoData, setUndoData] = useState<{ trades: Trade[], timeoutId: NodeJS.Timeout } | null>(null);

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedTradeIds(new Set());
        setUndoData(null); // Clear undo if mode changes (optional, but safer)
    };

    const toggleTradeSelection = (id: string) => {
        const next = new Set(selectedTradeIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedTradeIds(next);
    };

    const selectAllTrades = () => {
        if (selectedTradeIds.size === filteredTrades.length) {
            setSelectedTradeIds(new Set());
        } else {
            setSelectedTradeIds(new Set(filteredTrades.map(t => t.id)));
        }
    };

    const executeBulkDelete = () => {
        const idsToDelete = Array.from(selectedTradeIds);
        if (idsToDelete.length === 0) return;

        if (confirm(`Delete ${idsToDelete.length} trades?`)) {
            // Save for undo
            const tradesToDelete = trades.filter(t => idsToDelete.includes(t.id));

            // Execute delete
            onDeleteTrades?.(idsToDelete);

            // Set Undo State
            if (undoData) clearTimeout(undoData.timeoutId); // Clear existing timer

            const timeoutId = setTimeout(() => {
                setUndoData(null); // Clear undo after 5 seconds
            }, 5000);

            setUndoData({ trades: tradesToDelete, timeoutId });

            // Exit selection mode
            setIsSelectionMode(false);
            setSelectedTradeIds(new Set());
        }
    };

    const handleUndo = () => {
        if (undoData) {
            onRestoreTrades?.(undoData.trades);
            clearTimeout(undoData.timeoutId);
            setUndoData(null);
        }
    };

    // Performance Chart Toggles
    const [perfToggles, setPerfToggles] = useState({
        pnl: true,
        winRate: true,
        factor: false,
        avgWin: false,
        avgLoss: false
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const currency = getCurrencyFormatter(baseCurrency);

    const formatCurrencyValue = (val: number) => {
        return `${currency.symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDuration = (ms: number) => {
        if (!ms || ms === 0) return '0s';
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m ${seconds}s`;
    };

    const uniqueSymbols = useMemo(() => ['All', ...Array.from(new Set(trades.map(t => t.symbol)))].sort(), [trades]);
    const uniqueStrategies = useMemo(() => {
        const tradeStrategies = new Set(trades.map(t => t.strategy).filter((s): s is string => !!s));
        const playbookStrategies = strategies.filter(s => s.status === 'active').map(s => s.name);
        playbookStrategies.forEach(s => tradeStrategies.add(s));
        return ['All', ...Array.from(tradeStrategies)].sort();
    }, [trades, strategies]);
    const uniqueSetups = useMemo(() => {
        const allSetups = new Set<string>();
        trades.forEach(t => { if (t.setups && Array.isArray(t.setups)) t.setups.forEach(s => allSetups.add(s)); });
        strategies.filter(s => s.status === 'active').forEach(s => { if (s.setups && Array.isArray(s.setups)) s.setups.forEach(setup => allSetups.add(setup)); });
        return ['All', ...Array.from(allSetups).sort()];
    }, [trades, strategies]);
    const uniqueTags = useMemo(() => {
        const allTags = new Set<string>();
        if (tags) { (Object.values(tags) as Tag[][]).forEach(categoryTags => categoryTags.forEach(tag => allTags.add(tag.name))); }
        return ['All', ...Array.from(allTags).sort()];
    }, [tags]);

    const resetFilters = () => {
        setFilterSymbol('All'); setFilterStrategy('All'); setFilterSetup('All'); setFilterSide('All'); setFilterTag('All'); setFilterQuality('All');
        setDateFilter({ type: 'LIFETIME' });
    };

    const filteredTrades = useMemo(() => {
        let data = [...trades];
        if (filterSymbol !== 'All') data = data.filter(t => t.symbol === filterSymbol);
        if (filterStrategy !== 'All') data = data.filter(t => t.strategy === filterStrategy);
        if (filterSetup !== 'All') data = data.filter(t => t.setups?.includes(filterSetup));
        if (filterSide !== 'All') data = data.filter(t => t.side === filterSide);
        if (filterQuality !== 'All') {
            const stars = parseInt(filterQuality[0]); // Extract number from "X Stars"
            if (!isNaN(stars)) data = data.filter(t => t.exitQuality === stars);
        }
        if (filterTag !== 'All') {
            data = data.filter(t => t.entryReasons?.some(r => r === filterTag) || t.mentalState?.some(s => s === filterTag) || t.tags?.some(tag => tag === filterTag));
        }
        if (dateFilter.type === 'RELATIVE' && dateFilter.days) {
            const past = new Date(new Date().getTime() - (dateFilter.days * 24 * 60 * 60 * 1000));
            data = data.filter(t => new Date(t.entryDate) >= past);
        } else if (dateFilter.type === 'ABSOLUTE' && dateFilter.range) {
            const start = new Date(dateFilter.range.start); start.setHours(0, 0, 0, 0);
            const end = new Date(dateFilter.range.end); end.setHours(23, 59, 59, 999);
            data = data.filter(t => { const entry = new Date(t.entryDate); return entry >= start && entry <= end; });
        }
        return data;
    }, [trades, filterSymbol, filterStrategy, filterSetup, filterSide, filterTag, filterQuality, dateFilter]);

    const closedTrades = useMemo(() => filteredTrades.filter(t => t.status === TradeStatus.CLOSED).sort((a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime()), [filteredTrades]);

    // ... (Calculation Logic for stats - Keeping existing calculations) ...
    const totalTrades = closedTrades.length;
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.pnl || 0) <= 0);
    const totalWinPnl = winningTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const totalLossPnl = Math.abs(losingTrades.reduce((acc, t) => acc + (t.pnl || 0), 0));
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : (totalWinPnl > 0 ? 999 : 0);
    const netPnl = totalWinPnl - totalLossPnl;
    const expectancy = totalTrades > 0 ? netPnl / totalTrades : 0;
    const avgWin = winningTrades.length > 0 ? totalWinPnl / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? -totalLossPnl / losingTrades.length : 0;
    const highestWin = winningTrades.reduce((max, t) => Math.max(max, t.pnl || 0), 0);
    const highestLoss = losingTrades.reduce((min, t) => Math.min(min, t.pnl || 0), 0);
    const realizedRR = avgLoss !== 0 ? avgWin / Math.abs(avgLoss) : (avgWin > 0 ? 10 : 0);
    const highestWinPct = winningTrades.reduce((max, t) => Math.max(max, t.pnlPercentage || 0), 0);
    const highestLossPct = losingTrades.reduce((min, t) => Math.min(min, t.pnlPercentage || 0), 0);

    const tradePnLs = closedTrades.map(t => t.pnl || 0);
    const meanPnl = tradePnLs.length > 0 ? tradePnLs.reduce((a, b) => a + b, 0) / tradePnLs.length : 0;
    const variance = tradePnLs.length > 0 ? tradePnLs.reduce((a, b) => a + Math.pow(b - meanPnl, 2), 0) / tradePnLs.length : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? meanPnl / stdDev : 0;
    const downsidePnLs = tradePnLs.filter(p => p < 0);
    const varianceDown = tradePnLs.length > 0 ? downsidePnLs.reduce((a, b) => a + Math.pow(b, 2), 0) / tradePnLs.length : 0;
    const downsideDev = Math.sqrt(varianceDown);
    const sortinoRatio = downsideDev > 0 ? meanPnl / downsideDev : 0;

    const equityCurveStats = useMemo(() => {
        let balance = 0; let peak = 0; let maxDD = 0;
        closedTrades.forEach(t => { balance += t.pnl || 0; if (balance > peak) peak = balance; const dd = peak - balance; if (dd > maxDD) maxDD = dd; });
        return { maxDD };
    }, [closedTrades]);

    const recoveryFactor = equityCurveStats.maxDD > 0 ? netPnl / equityCurveStats.maxDD : 0;

    const feeStats = useMemo(() => {
        const exchangeFeeMap: Record<string, number> = {};
        let total = 0;

        closedTrades.forEach(t => {
            const ex = t.exchange || 'Unknown';
            const feeConfig = (exchangeFees && exchangeFees[ex]) || userFees;

            let fee = 0;
            if (feeConfig) {
                const isFixed = feeConfig.type === 'FIXED';
                const entryVol = t.entryPrice * t.quantity;
                const exitVol = (t.exitPrice || t.entryPrice) * t.quantity;

                if (isFixed) {
                    fee = (feeConfig.taker || 0) * 2; // Assume 2x for entry/exit
                } else {
                    const rate = (feeConfig.taker || 0.05) / 100;
                    fee = (entryVol * rate) + (exitVol * rate);
                }
            }

            exchangeFeeMap[ex] = (exchangeFeeMap[ex] || 0) + fee;
            total += fee;
        });
        return { total, exchangeFees: exchangeFeeMap };
    }, [closedTrades, userFees, exchangeFees]);

    const totalHoldTime = closedTrades.reduce((acc, t) => {
        const s = new Date(t.entryDate).getTime();
        const e = t.exitDate ? new Date(t.exitDate).getTime() : s;
        return acc + (e - s);
    }, 0);
    const avgHoldTime = totalTrades > 0 ? totalHoldTime / totalTrades : 0;

    const streaks = useMemo(() => {
        let currentWin = 0; let currentLoss = 0; let maxWin = 0; let maxLoss = 0;
        closedTrades.forEach(t => {
            const isWin = (t.pnl || 0) > 0;
            if (isWin) { currentWin++; currentLoss = 0; if (currentWin > maxWin) maxWin = currentWin; }
            else { currentLoss++; currentWin = 0; if (currentLoss > maxLoss) maxLoss = currentLoss; }
        });
        let activeStreakCount = 0;
        let activeStreakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
        if (closedTrades.length > 0) {
            const lastTrade = closedTrades[closedTrades.length - 1];
            const lastIsWin = (lastTrade.pnl || 0) > 0;
            for (let i = closedTrades.length - 1; i >= 0; i--) {
                const t = closedTrades[i];
                const isWin = (t.pnl || 0) > 0;
                if (isWin === lastIsWin) activeStreakCount++; else break;
            }
            if (activeStreakCount >= 1) activeStreakType = lastIsWin ? 'WIN' : 'LOSS';
        }
        return { maxWin, maxLoss, activeStreakCount, activeStreakType };
    }, [closedTrades]);

    const chartData = useMemo(() => {
        if (closedTrades.length === 0) return [];
        let runningPnl = 0, runningWins = 0, runningWinPnl = 0, runningLossPnl = 0;
        return closedTrades.map((t, index) => {
            const pnl = t.pnl || 0;
            runningPnl += pnl;
            if (pnl > 0) { runningWins++; runningWinPnl += pnl; } else { runningLossPnl += Math.abs(pnl); }
            const total = index + 1;
            const curAvgLoss = runningLossPnl > 0 && (total - runningWins) > 0 ? runningLossPnl / (total - runningWins) : 0;
            return {
                id: `Trade ${index + 1}`,
                date: new Date(t.exitDate || t.entryDate).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                cumulativePnl: runningPnl,
                winRate: (runningWins / total) * 100,
                profitFactor: runningLossPnl === 0 ? (runningWinPnl > 0 ? 5 : 0) : runningWinPnl / runningLossPnl,
                avgWin: runningWins > 0 ? runningWinPnl / runningWins : 0,
                avgLoss: curAvgLoss,
                pnl: pnl
            };
        });
    }, [closedTrades]);

    // --- Calendar Data Logic (Monthly) ---
    const calendarData = useMemo(() => {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday

        const days = [];
        // Padding
        for (let i = 0; i < firstDay; i++) days.push(null);

        for (let d = 1; d <= daysInMonth; d++) {
            // Find trades for this specific day (local time based on date string)
            const dayTrades = trades.filter(t => {
                const dDate = new Date(t.exitDate || t.entryDate);
                return dDate.getDate() === d && dDate.getMonth() === month && dDate.getFullYear() === year && t.status === TradeStatus.CLOSED;
            });

            const pnl = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
            const wins = dayTrades.filter(t => (t.pnl || 0) > 0).length;
            const count = dayTrades.length;

            days.push({ day: d, pnl, wins, count });
        }
        return days;
    }, [trades, calendarDate]);

    // --- Yearly Calendar Data Logic ---
    const yearlyData = useMemo(() => {
        const year = calendarDate.getFullYear();
        const monthData = [];

        for (let m = 0; m < 12; m++) {
            const daysInMonth = new Date(year, m + 1, 0).getDate();
            const firstDay = new Date(year, m, 1).getDay(); // 0 = Sunday
            const days = [];

            // Padding
            for (let i = 0; i < firstDay; i++) days.push(null);

            for (let d = 1; d <= daysInMonth; d++) {
                const dayTrades = trades.filter(t => {
                    const dDate = new Date(t.exitDate || t.entryDate);
                    return dDate.getDate() === d && dDate.getMonth() === m && dDate.getFullYear() === year && t.status === TradeStatus.CLOSED;
                });

                const pnl = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
                const count = dayTrades.length;

                days.push({ day: d, pnl, count });
            }
            monthData.push({ monthIndex: m, days });
        }
        return monthData;
    }, [trades, calendarDate]);

    // --- Deep Dive Aggregation Logic ---
    const deepDiveData = useMemo(() => {
        const closed = filteredTrades.filter(t => t.status === TradeStatus.CLOSED);

        const aggregate = (keyExtractor: (t: Trade) => string) => {
            const groups: Record<string, { pnl: number; wins: number; total: number }> = {};
            closed.forEach(t => {
                const key = keyExtractor(t);
                if (!groups[key]) groups[key] = { pnl: 0, wins: 0, total: 0 };
                groups[key].pnl += (t.pnl || 0);
                groups[key].total += 1;
                if ((t.pnl || 0) > 0) groups[key].wins += 1;
            });
            return Object.entries(groups).map(([name, stats]) => ({
                name,
                pnl: stats.pnl,
                winRate: (stats.wins / stats.total) * 100,
                count: stats.total
            })).sort((a, b) => b.pnl - a.pnl);
        };

        return {
            bySymbol: aggregate(t => t.symbol),
            byStrategy: aggregate(t => t.strategy || 'No Strategy'),
            byDay: aggregate(t => new Date(t.entryDate).toLocaleDateString('en-US', { weekday: 'long' })),
            byHour: aggregate(t => `${new Date(t.entryDate).getHours()}:00`),
            bySide: aggregate(t => t.side),
        };
    }, [filteredTrades]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const { trades: parsedTrades, errors } = processParsedData(results.data, results.meta.fields || []);
                if (parsedTrades.length > 0) {
                    if (onImportTrades) {
                        onImportTrades(parsedTrades);
                        alert(`Successfully imported ${parsedTrades.length} trades.`);
                    } else {
                        alert('Import function not available.');
                    }
                } else if (errors.length > 0) {
                    alert(`Import failed:\n${errors.join('\n')}`);
                } else {
                    alert('No valid trades found in CSV.');
                }
            },
            error: (error: Error) => {
                alert(`CSV Parsing Error: ${error.message}`);
            }
        });
        event.target.value = '';
    };

    const processParsedData = (data: any[], fields: string[]): { trades: Trade[], errors: string[] } => {
        const headers = fields.map(h => h.toLowerCase().trim());
        const findCol = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h === k || h.includes(k)));

        // Core Columns Mapping
        const dateIdx = findCol(['time', 'date', 'created', 'timestamp', 'datetime']);
        const symbolIdx = findCol(['contract', 'symbol', 'pair', 'instrument', 'ticker', 'market']);
        const sideIdx = findCol(['side', 'type', 'direction', 'action']);
        const priceIdx = findCol(['exec.price', 'price', 'avg', 'entry', 'fill', 'avg price']);
        const qtyIdx = findCol(['qty', 'quantity', 'amount', 'size', 'volume', 'executed']);
        const pnlIdx = findCol(['realised p&l', 'pnl', 'profit', 'roe', 'realized']);
        const feeIdx = findCol(['trading fees', 'fee', 'commission']);
        const statusIdx = findCol(['status', 'state']);

        const errors: string[] = [];
        if (symbolIdx === -1) errors.push('Missing Symbol column (e.g., Symbol, Pair, Ticker).');
        if (priceIdx === -1) errors.push('Missing Price column (e.g., Price, Avg Price, Entry).');
        if (dateIdx === -1) errors.push('Missing Date column (e.g., Date, Time, Created).');

        if (errors.length > 0) return { trades: [], errors };

        const parsedTrades: Trade[] = [];

        data.forEach((row: any, i) => {
            try {
                const getVal = (idx: number) => idx !== -1 ? row[fields[idx]] : undefined;

                const statusVal = getVal(statusIdx);
                if (statusVal && (String(statusVal).toLowerCase().includes('cancelled') || String(statusVal).toLowerCase().includes('rejected'))) return;

                let dateStr = getVal(dateIdx);
                if (dateStr) {
                    dateStr = String(dateStr).replace(/\s+[A-Z]{3,4}\s+Asia\/[a-zA-Z]+$/, '').trim();
                    dateStr = dateStr.replace(/\s[A-Z]{3}$/, '').trim();
                }
                const dateVal = new Date(dateStr);
                const validDate = !isNaN(dateVal.getTime()) ? dateVal.toISOString() : new Date().toISOString();

                const symbol = getVal(symbolIdx) ? String(getVal(symbolIdx)).toUpperCase() : 'UNKNOWN';

                const priceStr = String(getVal(priceIdx)).replace(/[^0-9.-]/g, '');
                const price = parseFloat(priceStr);

                const qtyStr = String(getVal(qtyIdx)).replace(/[^0-9.-]/g, '');
                const qty = parseFloat(qtyStr);

                const pnlStr = pnlIdx !== -1 ? String(getVal(pnlIdx)).replace(/[^0-9.-]/g, '') : '0';
                const pnl = parseFloat(pnlStr);

                const feeStr = feeIdx !== -1 ? String(getVal(feeIdx)).replace(/[^0-9.-]/g, '') : '0';
                const fee = parseFloat(feeStr);

                let side = TradeSide.LONG;
                const sideVal = getVal(sideIdx);
                if (sideVal) {
                    const s = String(sideVal).toLowerCase();
                    if (s.includes('sell') || s.includes('short')) side = TradeSide.SHORT;
                }

                const status = (pnl !== 0 || fee > 0 || (statusVal && String(statusVal).toLowerCase() === 'closed')) ? TradeStatus.CLOSED : TradeStatus.OPEN;

                if (!isNaN(price) && symbol !== 'UNKNOWN') {
                    parsedTrades.push({
                        id: `imp-${Date.now()}-${i}`,
                        symbol,
                        side,
                        entryPrice: price,
                        quantity: isNaN(qty) ? 0 : Math.abs(qty),
                        pnl: isNaN(pnl) ? 0 : pnl,
                        pnlPercentage: 0,
                        status,
                        entryDate: validDate,
                        exitDate: status === TradeStatus.CLOSED ? validDate : undefined,
                        exchange: 'Imported',
                        strategy: 'Imported',
                        notes: `Imported via CSV. Fees: ${fee.toFixed(4)}`,
                        riskReward: 0,
                        capital: Math.abs(price * qty),
                        leverage: 1,
                        tradeType: 'PAST'
                    });
                }
            } catch (err) {
                console.error('Row parse error:', err);
            }
        });

        return { trades: parsedTrades, errors: [] };
    };

    const handleExportCSV = () => {
        if (!trades || trades.length === 0) {
            alert('No trades to export.');
            return;
        }
        const csv = Papa.unparse(trades);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `trades_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getDateFilterLabel = () => {
        if (dateFilter.type === 'LIFETIME') return 'Lifetime';
        if (dateFilter.type === 'RELATIVE' && dateFilter.days) return `Last ${dateFilter.days} Days`;
        if (dateFilter.type === 'ABSOLUTE' && dateFilter.range) return `${new Date(dateFilter.range.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${new Date(dateFilter.range.end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        return 'Select Range';
    };

    const handleCalendarNav = (direction: 'prev' | 'next') => {
        if (calendarViewMode === 'Monthly') {
            const offset = direction === 'prev' ? -1 : 1;
            setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + offset, 1));
        } else {
            const offset = direction === 'prev' ? -1 : 1;
            setCalendarDate(new Date(calendarDate.getFullYear() + offset, 0, 1));
        }
    };

    const handleMonthClick = (monthIndex: number) => {
        setCalendarDate(new Date(calendarDate.getFullYear(), monthIndex, 1));
        setCalendarViewMode('Monthly');
    };

    const FilterBar = () => (
        <div className="flex flex-wrap items-center gap-4 mb-4">
            <button onClick={() => setIsDateModalOpen(true)} className="bg-[#0B0E14] border border-slate-800 text-white text-xs font-bold rounded-lg px-4 py-2 outline-none focus:border-indigo-500 transition-colors flex items-center gap-2 min-w-[140px]">
                <i className="fa-regular fa-calendar text-slate-400"></i><span>{getDateFilterLabel()}</span><i className="fa-solid fa-chevron-down text-[10px] text-slate-500 ml-auto"></i>
            </button>
            <FilterDropdown label="Symbol" value={filterSymbol} onChange={setFilterSymbol} options={uniqueSymbols} />
            <FilterDropdown label="Strategy" value={filterStrategy} onChange={setFilterStrategy} options={uniqueStrategies} />
            <FilterDropdown label="Setup" value={filterSetup} onChange={setFilterSetup} options={uniqueSetups} />
            <FilterDropdown label="Tag" value={filterTag} onChange={setFilterTag} options={uniqueTags} />
            <FilterDropdown label="Quality" value={filterQuality} onChange={setFilterQuality} options={['All', '1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars']} />
            <select value={filterSide} onChange={(e) => setFilterSide(e.target.value)} className="bg-[#0B0E14] border border-slate-800 text-white text-xs font-bold rounded-lg px-4 py-2 outline-none focus:border-indigo-500 transition-colors">
                <option value="All">Filter by side</option><option value={TradeSide.LONG}>Long</option><option value={TradeSide.SHORT}>Short</option>
            </select>
            <button onClick={resetFilters} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all ml-auto" title="Reset all filters"><i className="fa-solid fa-rotate-left"></i> Reset</button>
            <div className="h-8 w-[1px] bg-slate-800 mx-2"></div>
            <button
                onClick={toggleSelectionMode}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${isSelectionMode ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' : 'text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'}`}
                title="Bulk Delete Mode"
            >
                <i className={`fa-solid ${isSelectionMode ? 'fa-check' : 'fa-trash-can'}`}></i>
                {isSelectionMode ? 'Done' : 'Trash'}
            </button>
            {isSelectionMode && selectedTradeIds.size > 0 && (
                <button
                    onClick={executeBulkDelete}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-[0_0_10px_rgba(244,63,94,0.4)] animate-in fade-in slide-in-from-right-4"
                >
                    Delete ({selectedTradeIds.size})
                </button>
            )}
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12 relative">
            {/* Undo Notification */}
            {undoData && (
                <div className="fixed bottom-8 left-8 z-50 flex items-center gap-4 bg-[#151A25] border border-slate-700 p-4 rounded-lg shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <i className="fa-solid fa-check"></i>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Trades Deleted</p>
                            <p className="text-xs text-slate-500">{undoData.trades.length} trades removed.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleUndo}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded flex items-center gap-2 transition-colors ml-4"
                    >
                        <i className="fa-solid fa-rotate-left"></i> Undo
                    </button>
                    <button onClick={() => setUndoData(null)} className="text-slate-500 hover:text-white ml-2">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                    <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 animate-[width_5s_linear_forwards]" style={{ width: '100%' }}></div>
                </div>
            )}

            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]"><i className="fa-solid fa-chart-simple text-indigo-400"></i></div>
                        <h1 className="text-3xl font-bold text-white">Performance <span className="text-indigo-400">Analytics</span></h1>
                    </div>
                    <p className="text-slate-400 pl-[52px]">Review your performance and trade history with deep insights.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-1 rounded-2xl bg-[#0F1218] p-1.5 w-fit border border-slate-800/50">
                    {['Analysis', 'Log', 'Calendar', 'Deep Dive'].map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 rounded-xl px-6 py-2 text-sm font-medium transition-all ${activeTab === tab ? 'bg-[#1E2330] text-white shadow-lg shadow-black/20 ring-1 ring-white/5' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1E2330]/50'}`}>
                            {tab === 'Calendar' && <i className="fa-regular fa-calendar text-xs"></i>}{tab}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            const analysisData = {
                                period: dateFilter.type,
                                tradeCount: totalTrades,
                                winRate: winRate,
                                profitFactor: profitFactor,
                                expectancy: expectancy,
                                netPnL: netPnl,
                                avgWin: avgWin,
                                avgLoss: avgLoss,
                                maxDrawdown: equityCurveStats.maxDD,
                                trades: filteredTrades.map(t => ({
                                    symbol: t.symbol,
                                    side: t.side,
                                    pnl: t.pnl,
                                    date: t.entryDate,
                                    strategy: t.strategy,
                                    tags: [...(t.mentalState || []), ...(t.tags || [])]
                                })),
                                deepDive: deepDiveData
                            };
                            onSeekWisdom?.(analysisData);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/20"
                    >
                        <i className="fa-solid fa-kaaba"></i> Seek Wisdom
                    </button>
                    <input type="file" accept=".csv,.txt" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-[#151A25] px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-500 transition-colors"><i className="fa-solid fa-file-import"></i> Import</button>
                    <button onClick={handleExportCSV} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-[#151A25] px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-500 transition-colors"><i className="fa-solid fa-download"></i> Export</button>
                </div>
            </div>

            {isDateModalOpen && <TimeFragmentModal onClose={() => setIsDateModalOpen(false)} onApply={(filter) => { setDateFilter(filter); setIsDateModalOpen(false); }} currentFilter={dateFilter} />}
            {infoModalKey && METRIC_DEFINITIONS[infoModalKey] && <MetricInfoModal data={METRIC_DEFINITIONS[infoModalKey]} onClose={() => setInfoModalKey(null)} />}
            {showFeeModal && <FeeBreakdownModal feeData={feeStats} baseCurrency={currency.symbol} onClose={() => setShowFeeModal(false)} />}
            {viewTrade && <TradeDetailsModal trade={viewTrade} onClose={() => setViewTrade(null)} baseCurrency={baseCurrency} userFees={userFees} />}

            {activeTab === 'Analysis' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <FilterBar />

                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        {/* 1. Cumulative P&L Chart */}
                        <Card className="min-h-[450px]">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3 border-l-4 border-indigo-500 pl-4 py-1">
                                    <h3 className="text-lg font-bold text-white">Cumulative P&L Over Time</h3>
                                </div>
                            </div>
                            <div className="h-[320px] w-full">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <defs><linearGradient id="colorCumPnl" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => formatCurrencyValue(val)} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} itemStyle={{ color: '#818cf8' }} formatter={(value: number) => [`${formatCurrencyValue(value)}`, 'Cumulative P&L']} labelStyle={{ color: '#94a3b8' }} />
                                            <Area type="monotone" dataKey="cumulativePnl" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorCumPnl)" />
                                            <Brush dataKey="date" height={10} stroke="#4f46e5" fill="#1e293b" tickFormatter={() => ''} className='opacity-50' />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : <div className="flex h-full items-center justify-center text-slate-500">No closed trades to display data.</div>}
                            </div>
                        </Card>

                        {/* 2. Performance Over Time Chart */}
                        <Card className="min-h-[450px]">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                                <div className="flex items-center gap-3 border-l-4 border-emerald-500 pl-4 py-1">
                                    <h3 className="text-lg font-bold text-white">Performance Over Time</h3>
                                </div>
                                <div className="flex items-center gap-2 bg-[#0F1218] p-1 rounded-lg border border-slate-800">
                                    <span className="text-[10px] font-bold text-slate-500 px-3 uppercase tracking-wider">Metrics</span>
                                    <ToggleBtn label="P&L" active={perfToggles.pnl} onClick={() => setPerfToggles(p => ({ ...p, pnl: !p.pnl }))} color="bg-indigo-500/20 text-indigo-400 border-indigo-500/50" />
                                    <ToggleBtn label="Win Rate" active={perfToggles.winRate} onClick={() => setPerfToggles(p => ({ ...p, winRate: !p.winRate }))} color="bg-emerald-500/20 text-emerald-400 border-emerald-500/50" />
                                    <ToggleBtn label="Factor" active={perfToggles.factor} onClick={() => setPerfToggles(p => ({ ...p, factor: !p.factor }))} color="bg-blue-500/20 text-blue-400 border-blue-500/50" />
                                    <ToggleBtn label="Avg Win" active={perfToggles.avgWin} onClick={() => setPerfToggles(p => ({ ...p, avgWin: !p.avgWin }))} color="bg-amber-500/20 text-amber-400 border-amber-500/50" />
                                    <ToggleBtn label="Avg Loss" active={perfToggles.avgLoss} onClick={() => setPerfToggles(p => ({ ...p, avgLoss: !p.avgLoss }))} color="bg-rose-500/20 text-rose-400 border-rose-500/50" />
                                </div>
                            </div>
                            <div className="h-[320px] w-full">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                                            <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} hide={!perfToggles.winRate} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                                labelStyle={{ color: '#94a3b8', marginBottom: '5px' }}
                                                formatter={(value: any, name: string) => {
                                                    if (name.includes('P&L') || name.includes('Win') || name.includes('Loss')) return [formatCurrencyValue(Number(value)), name];
                                                    if (name.includes('Rate')) return [`${Number(value).toFixed(1)}%`, name];
                                                    return [Number(value).toFixed(2), name];
                                                }}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            {perfToggles.pnl && <Line yAxisId="left" type="monotone" dataKey="cumulativePnl" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Cumulative P&L" activeDot={{ r: 6 }} />}
                                            {perfToggles.winRate && <Line yAxisId="right" type="monotone" dataKey="winRate" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Win Rate (%)" />}
                                            {perfToggles.factor && <Line yAxisId="right" type="monotone" dataKey="profitFactor" stroke="#3b82f6" strokeWidth={2} dot={false} name="Profit Factor" />}
                                            {perfToggles.avgWin && <Line yAxisId="left" type="monotone" dataKey="avgWin" stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" dot={false} name="Avg Win" />}
                                            {perfToggles.avgLoss && <Line yAxisId="left" type="monotone" dataKey="avgLoss" stroke="#f43f5e" strokeWidth={2} strokeDasharray="3 3" dot={false} name="Avg Loss" />}
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : <div className="flex h-full items-center justify-center text-slate-500">No data available for performance chart.</div>}
                            </div>
                        </Card>

                        {/* 3. Performance Edge Grid */}
                        <div>
                            <div className="flex items-center gap-3 border-l-4 border-purple-500 pl-4 py-1 mb-6">
                                <h3 className="text-lg font-bold text-white">Performance Edge <span className="ml-2 rounded-md bg-[#2E1065] text-[#A78BFA] border border-[#8B5CF6]/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Live</span></h3>
                            </div>

                            {/* Top Row: Key KPIs */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                                <StatCard label="Total Trades" value={totalTrades.toString()} valueSize="text-3xl" onInfoClick={() => setInfoModalKey('Total Trades')} />
                                <div className="rounded-2xl border border-slate-800 bg-[#151A25] p-6 h-32 flex flex-col justify-between relative overflow-hidden group">
                                    <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity"><i className="fa-solid fa-chart-pie text-4xl text-emerald-500"></i></div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-medium text-slate-400">Profit Ratio</span>
                                        <i onClick={() => setInfoModalKey('Profit Ratio')} className="fa-regular fa-circle-question text-slate-600 text-[10px] cursor-help hover:text-white transition-colors"></i>
                                    </div>
                                    <p className="text-3xl font-bold text-emerald-400">{winRate.toFixed(0)}%</p>
                                    <div className="space-y-2">
                                        <div className="h-1.5 w-full bg-[#1E2330] rounded-full overflow-hidden flex">
                                            <div style={{ width: `${winRate}%` }} className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                            <div style={{ width: `${100 - winRate}%` }} className="h-full bg-rose-500 opacity-30"></div>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold">
                                            <span className="text-emerald-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Profit trades ({winningTrades.length})</span>
                                            <span className="text-rose-500 flex items-center gap-1">Loss trades ({losingTrades.length}) <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span></span>
                                        </div>
                                    </div>
                                </div>
                                <StatCard label="Profit Factor" value={profitFactor.toFixed(2)} valueSize="text-3xl" onInfoClick={() => setInfoModalKey('Profit Factor')} />
                            </div>

                            {/* Detailed Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                <StatCard label="Expectancy" value={`${expectancy < 0 ? '-' : ''}${currency.symbol}${Math.abs(expectancy).toFixed(2)}`} valueColor={expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'} onInfoClick={() => setInfoModalKey('Expectancy')} />
                                <StatCard label="Avg. Win / Loss" value={`${realizedRR.toFixed(2)}`} onInfoClick={() => setInfoModalKey('Realized R:R')} />
                                <StatCard label="Sharpe Ratio" value={sharpeRatio.toFixed(2)} onInfoClick={() => setInfoModalKey('Sharpe Ratio')} />
                                <StatCard label="Avg. Win" value={formatCurrencyValue(avgWin)} valueColor="text-emerald-400" onInfoClick={() => setInfoModalKey('Avg. Win')} />

                                <StatCard label="Avg. Loss" value={formatCurrencyValue(avgLoss)} valueColor="text-rose-400" onInfoClick={() => setInfoModalKey('Avg. Loss')} />
                                <StatCard label="Highest Win" value={formatCurrencyValue(highestWin)} valueColor="text-emerald-400" onInfoClick={() => setInfoModalKey('Highest Win')} />
                                <StatCard label="Highest Loss" value={formatCurrencyValue(highestLoss)} valueColor="text-rose-400" onInfoClick={() => setInfoModalKey('Highest Loss')} />
                                <StatCard label="Highest Win %" value={`${highestWinPct.toFixed(2)}%`} onInfoClick={() => setInfoModalKey('Highest Win %')} />

                                <StatCard label="Highest Loss %" value={`${highestLossPct.toFixed(2)}%`} valueColor="text-rose-400" onInfoClick={() => setInfoModalKey('Highest Loss %')} />
                                <StatCard label="Max Win Streak" value={streaks.maxWin.toString()} valueColor="text-emerald-400" onInfoClick={() => setInfoModalKey('Max Win Streak')} />
                                <StatCard label="Max Loss Streak" value={streaks.maxLoss.toString()} valueColor="text-rose-400" onInfoClick={() => setInfoModalKey('Max Loss Streak')} />

                                <div className="rounded-xl border border-slate-800 bg-[#151A25] p-4 flex flex-col justify-between min-h-[100px]">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-medium text-slate-500">Current Streak</span>
                                        <i onClick={() => setInfoModalKey('Current Streak')} className="fa-regular fa-circle-question text-[10px] text-slate-600 cursor-help hover:text-white transition-colors"></i>
                                    </div>
                                    <div>
                                        {streaks.activeStreakType === 'NONE' ? (
                                            <span className="text-xl font-bold text-slate-500">No Streak</span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className={`text-2xl font-bold ${streaks.activeStreakType === 'WIN' ? 'text-emerald-400' : 'text-rose-400'}`}>{streaks.activeStreakCount}</span>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${streaks.activeStreakType === 'WIN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{streaks.activeStreakType}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 4. Risk Management Section */}
                            <div className="pt-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3 border-l-4 border-rose-500 pl-4 py-1">
                                        <h3 className="text-lg font-bold text-white">Risk Management</h3>
                                    </div>
                                    <button onClick={() => onNavigateToPlaybook && onNavigateToPlaybook('goals-risk')} className="flex items-center gap-2 px-3 py-1.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold hover:bg-rose-500 hover:text-white transition-colors">
                                        <i className="fa-solid fa-shield-halved"></i> MANAGE GOALS & RISK
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                    <RiskCard label="Max Drawdown" value={currency.format(equityCurveStats.maxDD)} valueColor="text-rose-400" onInfoClick={() => setInfoModalKey('Max Drawdown')} />
                                    <RiskCard label="Avg. Holding Time" value={formatDuration(avgHoldTime)} valueColor="text-white" onInfoClick={() => setInfoModalKey('Avg. Holding Time')} />
                                    <RiskCard label="Recovery Time" value="N/A" sub="days" onInfoClick={() => setInfoModalKey('Recovery Time')} />
                                    <RiskCard label="Return Volatility" value={stdDev.toFixed(2)} onInfoClick={() => setInfoModalKey('Return Volatility')} />
                                    <RiskCard label="Sortino Ratio" value={sortinoRatio.toFixed(2)} onInfoClick={() => setInfoModalKey('Sortino Ratio')} />
                                    <RiskCard label="Recovery Factor" value={recoveryFactor.toFixed(2)} onInfoClick={() => setInfoModalKey('CAGR vs. Max DD')} />
                                    <div className="rounded-xl border border-slate-800 bg-[#0B0E14] p-4 relative flex flex-col justify-between h-24 cursor-pointer hover:border-slate-600 transition-colors group" onClick={() => setShowFeeModal(true)}>
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs text-slate-500 leading-tight">Total Fees Paid</span>
                                            <i onClick={(e) => { e.stopPropagation(); setInfoModalKey('Total Fees Paid'); }} className="fa-regular fa-circle-question text-[10px] text-slate-600 cursor-help hover:text-white transition-colors"></i>
                                        </div>
                                        <div className="text-lg font-bold text-white flex items-center justify-between">
                                            {currency.format(feeStats.total)}
                                            <i className="fa-solid fa-chevron-right text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TRADE LOG --- */}
            {activeTab === 'Log' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <FilterBar />

                    <Card title={`Trade History (${filteredTrades.length})`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#0B0E14] text-slate-400 font-medium border-b border-slate-800">
                                    <tr>
                                        {isSelectionMode && (
                                            <th className="px-4 py-4 w-10 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTradeIds.size === filteredTrades.length && filteredTrades.length > 0}
                                                    onChange={selectAllTrades}
                                                    className="rounded border-slate-700 bg-slate-800 text-rose-500 focus:ring-0 focus:ring-offset-0"
                                                />
                                            </th>
                                        )}
                                        <th className="px-6 py-4 font-semibold whitespace-nowrap">Date</th>
                                        <th className="px-6 py-4 font-semibold whitespace-nowrap">Symbol</th>
                                        <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Side</th>
                                        <th className="px-6 py-4 font-semibold whitespace-nowrap">Tags</th>
                                        <th className="px-6 py-4 font-semibold whitespace-nowrap">Strategy</th>
                                        <th className="px-6 py-4 font-semibold whitespace-nowrap text-right">Entry</th>
                                        <th className="px-6 py-4 font-semibold whitespace-nowrap text-right">Exit</th>
                                        <th className="px-6 py-4 font-semibold whitespace-nowrap text-right">PnL</th>
                                        <th className="px-6 py-4 font-semibold whitespace-nowrap text-right">ROI</th>
                                        <th className="px-6 py-4 font-semibold whitespace-nowrap text-center">Quality</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {filteredTrades.length > 0 ? filteredTrades.map(trade => {
                                        // Collect tags to display
                                        const displayTags = [
                                            ...(trade.mentalState || []),
                                            ...(trade.tags || [])
                                        ].slice(0, 3); // Limit to 3 tags to prevent overcrowding

                                        // Derive missing values for display (common in CSV imports)
                                        const displayedExitPrice = trade.exitPrice || (
                                            trade.status === TradeStatus.CLOSED && trade.quantity > 0
                                                ? (trade.side === TradeSide.LONG ? trade.entryPrice + ((trade.pnl || 0) / trade.quantity) : trade.entryPrice - ((trade.pnl || 0) / trade.quantity))
                                                : undefined
                                        );

                                        const displayedROI = trade.pnlPercentage || (
                                            (trade.entryPrice > 0 && trade.quantity > 0) ? ((trade.pnl || 0) / (trade.entryPrice * trade.quantity)) * 100 : 0
                                        );

                                        return (
                                            <tr key={trade.id} onClick={(e) => isSelectionMode ? toggleTradeSelection(trade.id) : setViewTrade(trade)} className={`hover:bg-[#1E2330] transition-colors cursor-pointer group ${isSelectionMode && selectedTradeIds.has(trade.id) ? 'bg-rose-500/5' : ''}`}>
                                                {isSelectionMode && (
                                                    <td className="px-4 py-4 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTradeIds.has(trade.id)}
                                                            onChange={() => toggleTradeSelection(trade.id)}
                                                            className="rounded border-slate-700 bg-slate-800 text-rose-500 focus:ring-0 focus:ring-offset-0"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                                                    {new Date(trade.entryDate).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-white">{trade.symbol}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${trade.side === TradeSide.LONG
                                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                        : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                        }`}>
                                                        {trade.side}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flax-wrap gap-1 max-w-[200px]">
                                                        {displayTags.length > 0 ? displayTags.map((tagName, idx) => {
                                                            // Find tag definition
                                                            let tagDef: Tag | undefined;
                                                            Object.values(tags).forEach(categoryTags => {
                                                                if (!tagDef) tagDef = categoryTags.find(t => t.name === tagName);
                                                            });

                                                            const color = tagDef?.color || 'slate';
                                                            const styles = TAG_COLORS[color];
                                                            const isBold = tagDef?.isBold;
                                                            const hasGlow = tagDef?.hasGlow;

                                                            return (
                                                                <span
                                                                    key={idx}
                                                                    className={`px-2 py-0.5 rounded text-[10px] border whitespace-nowrap transition-all
                                                                ${styles?.bg || 'bg-slate-500/10'} 
                                                                ${styles?.border || 'border-slate-500/20'} 
                                                                ${styles?.text || 'text-slate-400'}
                                                                ${isBold ? 'font-bold' : 'font-medium'}
                                                                ${hasGlow && styles?.glow ? styles.glow : ''}
                                                            `}
                                                                >
                                                                    {tagName}
                                                                </span>
                                                            );
                                                        }) : <span className="text-slate-600 text-xs">-</span>}
                                                        {(trade.mentalState?.length || 0) + (trade.tags?.length || 0) > 3 && (
                                                            <span className="text-[10px] text-slate-500 self-center">+{((trade.mentalState?.length || 0) + (trade.tags?.length || 0)) - 3}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-300">{trade.strategy || '-'}</td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-300">{trade.entryPrice.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-300">{displayedExitPrice ? displayedExitPrice.toLocaleString() : '-'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-mono font-bold ${(trade.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {(trade.pnl || 0) >= 0 ? '+' : ''}{formatCurrencyValue(trade.pnl || 0)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-mono font-bold text-xs ${(trade.pnlPercentage || 0) >= 0 || displayedROI >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {displayedROI >= 0 ? '+' : ''}{displayedROI.toFixed(2)}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-xs text-yellow-400">
                                                    {trade.exitQuality ? (
                                                        <div className="flex gap-0.5 justify-center">
                                                            {Array.from({ length: trade.exitQuality }).map((_, i) => <i key={i} className="fa-solid fa-star text-[10px]"></i>)}
                                                        </div>
                                                    ) : <span className="text-slate-600">-</span>}
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={11} className="px-6 py-12 text-center text-slate-500 italic">
                                                No trades found matching filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* --- CALENDAR VIEW --- */}
            {activeTab === 'Calendar' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-white">Profit Calendar</h2>
                            {/* Toggle View Mode */}
                            <div className="flex bg-[#151A25] p-1 rounded-lg border border-slate-800">
                                <button
                                    onClick={() => setCalendarViewMode('Monthly')}
                                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${calendarViewMode === 'Monthly' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
                                >
                                    Monthly
                                </button>
                                <button
                                    onClick={() => setCalendarViewMode('Yearly')}
                                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${calendarViewMode === 'Yearly' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
                                >
                                    Yearly
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                            <div className="flex gap-2">
                                <button onClick={() => handleCalendarNav('prev')} className="h-8 w-8 flex items-center justify-center rounded text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                                    <i className="fa-solid fa-chevron-left text-xs"></i>
                                </button>
                                <span className="px-4 text-sm font-bold text-white min-w-[140px] text-center flex items-center justify-center">
                                    {calendarViewMode === 'Monthly'
                                        ? calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })
                                        : calendarDate.getFullYear()
                                    }
                                </span>
                                <button onClick={() => handleCalendarNav('next')} className="h-8 w-8 flex items-center justify-center rounded text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                                    <i className="fa-solid fa-chevron-right text-xs"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* --- MONTHLY VIEW --- */}
                    {calendarViewMode === 'Monthly' && (
                        <div className="grid grid-cols-7 gap-4">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-xs font-bold text-slate-500 uppercase py-2">{day}</div>
                            ))}

                            {calendarData.map((dayData, idx) => {
                                if (!dayData) return <div key={`empty-${idx}`} className="h-32 rounded-xl bg-transparent"></div>;

                                const isPositive = dayData.pnl > 0;
                                const isZero = dayData.pnl === 0 && dayData.count > 0;
                                const hasTrades = dayData.count > 0;

                                return (
                                    <div
                                        key={`day-${dayData.day}`}
                                        className={`h-32 rounded-xl border p-3 flex flex-col justify-between transition-all hover:scale-[1.02] ${hasTrades
                                            ? isPositive ? 'bg-emerald-500/10 border-emerald-500/30' : isZero ? 'bg-slate-800/50 border-slate-700' : 'bg-rose-500/10 border-rose-500/30'
                                            : 'bg-[#151A25] border-slate-800 opacity-50'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={`text-sm font-bold ${hasTrades ? 'text-white' : 'text-slate-600'}`}>{dayData.day}</span>
                                            {hasTrades && (
                                                <span className="text-[10px] font-bold bg-black/40 px-1.5 py-0.5 rounded text-slate-300">
                                                    {dayData.count} T
                                                </span>
                                            )}
                                        </div>

                                        {hasTrades && (
                                            <div className="text-right">
                                                <p className={`text-lg font-bold font-mono ${isPositive ? 'text-emerald-400' : isZero ? 'text-slate-300' : 'text-rose-400'}`}>
                                                    {isPositive ? '+' : ''}{formatCurrencyValue(dayData.pnl)}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    {dayData.wins}W / {dayData.count - dayData.wins}L
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* --- YEARLY VIEW --- */}
                    {calendarViewMode === 'Yearly' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-300">
                            {yearlyData.map((month) => {
                                const monthName = new Date(calendarDate.getFullYear(), month.monthIndex).toLocaleString('default', { month: 'long' });
                                return (
                                    <div
                                        key={month.monthIndex}
                                        onClick={() => handleMonthClick(month.monthIndex)}
                                        className="rounded-xl border border-slate-800 bg-[#151A25] p-4 cursor-pointer hover:border-slate-600 transition-colors"
                                    >
                                        <h3 className="text-sm font-bold text-white text-center mb-3">{monthName}</h3>
                                        <div className="grid grid-cols-7 gap-1">
                                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                                <div key={i} className="text-[8px] font-bold text-slate-600 text-center uppercase">{d}</div>
                                            ))}
                                            {month.days.map((day, dIdx) => {
                                                if (!day) return <div key={`empty-${dIdx}`} className="h-6 w-6"></div>;

                                                const hasTrades = day.count > 0;
                                                const isWin = day.pnl > 0;
                                                const isLoss = day.pnl < 0;

                                                return (
                                                    <div
                                                        key={`d-${day.day}`}
                                                        className={`h-6 w-6 rounded flex items-center justify-center text-[9px] font-bold ${hasTrades
                                                            ? isWin
                                                                ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                                                                : isLoss
                                                                    ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30'
                                                                    : 'bg-slate-700 text-slate-300'
                                                            : 'text-slate-600 hover:bg-slate-800'
                                                            }`}
                                                        title={hasTrades ? `${day.day}: ${isWin ? '+' : ''}${formatCurrencyValue(day.pnl)}` : `${day.day}`}
                                                    >
                                                        {day.day}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* --- DEEP DIVE VIEW --- */}
            {activeTab === 'Deep Dive' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <FilterBar />

                    <div className="flex items-center gap-4 mb-4">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Breakdown By:</span>
                        <div className="flex bg-[#151A25] p-1 rounded-lg border border-slate-800">
                            {['Symbol', 'Strategy', 'Day', 'Hour', 'Side'].map((view) => (
                                <button
                                    key={view}
                                    onClick={() => setDeepDiveView(view as any)}
                                    className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${deepDiveView === view ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    {view}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Chart Column */}
                        <div className="lg:col-span-2">
                            <Card title={`${deepDiveView} Performance`}>
                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={deepDiveData[`by${deepDiveView}` as keyof typeof deepDiveData]}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                stroke="#64748b"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                interval={0}
                                                angle={-45}
                                                textAnchor="end"
                                            />
                                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                                            <Tooltip
                                                cursor={{ fill: '#1e293b', opacity: 0.4 }}
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                                formatter={(value: number) => [formatCurrencyValue(value), 'Net PnL']}
                                            />
                                            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                                {deepDiveData[`by${deepDiveView}` as keyof typeof deepDiveData].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </div>

                        {/* Table Column */}
                        <div>
                            <Card title="Detailed Stats">
                                <div className="overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 bg-[#151A25] text-slate-500 font-bold uppercase border-b border-slate-800">
                                            <tr>
                                                <th className="pb-3">{deepDiveView}</th>
                                                <th className="pb-3 text-right">Win Rate</th>
                                                <th className="pb-3 text-right">PnL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {deepDiveData[`by${deepDiveView}` as keyof typeof deepDiveData].map((item, idx) => (
                                                <tr key={idx} className="group hover:bg-[#1E2330] transition-colors">
                                                    <td className="py-3 font-bold text-white group-hover:text-indigo-400 transition-colors">
                                                        {item.name}
                                                        <span className="ml-2 text-[10px] font-normal text-slate-500 bg-black/20 px-1.5 py-0.5 rounded">{item.count}</span>
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <span className="text-slate-300">{item.winRate.toFixed(0)}%</span>
                                                            <div className="w-8 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                                <div style={{ width: `${item.winRate}%` }} className="h-full bg-emerald-500"></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`py-3 text-right font-mono font-bold ${item.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {formatCurrencyValue(item.pnl)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Analytics;

