import React, { useMemo, useState, useRef } from 'react';
import { Trade, TradeStatus, UserProfile, TIMEZONES, HabitCompletions } from '../types';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

interface ProfileProps {
    trades: Trade[];
    userProfile?: UserProfile;
    onUpdateProfile?: (profile: UserProfile) => void;
    exchanges?: string[];
    onUpdateExchanges?: (exchanges: string[]) => void;
    onEditFees?: () => void;
    habitCompletions?: HabitCompletions;
}

const TRADER_LEVELS = [
    { name: 'Novice', minPF: 0, maxDD: 100, minRR: 0, color: 'text-slate-500', desc: 'Survival & Edge Repair' },
    { name: 'Survivor', minPF: 1.5, maxDD: 22, minRR: 0.1, color: 'text-cyan-400', desc: 'Basic Consistency' },
    { name: 'Consistent', minPF: 1.8, maxDD: 18, minRR: 0.25, color: 'text-emerald-400', desc: 'Sustainable Edge' },
    { name: 'Warrior', minPF: 2.3, maxDD: 14, minRR: 0.45, color: 'text-amber-400', desc: 'High-Quality Asymmetry' },
    { name: 'Elite', minPF: 3.0, maxDD: 10, minRR: 0.8, color: 'text-rose-400', desc: 'Rare Excellence' },
    { name: 'GOD', minPF: 4.5, maxDD: 8, minRR: 1.4, color: 'text-purple-400', desc: 'Unicorn Status' },
];

const getTraderLevel = (pf: number, dd: number, rr: number) => {
    for (let i = TRADER_LEVELS.length - 1; i >= 0; i--) {
        const lvl = TRADER_LEVELS[i];
        if (pf >= lvl.minPF && dd <= lvl.maxDD && rr >= lvl.minRR) {
            return lvl;
        }
    }
    return TRADER_LEVELS[0];
};

const Profile: React.FC<ProfileProps> = ({
    trades,
    userProfile = { nickname: 'Trader', bio: 'A short bio...', primaryExchange: 'Binance', timezone: 'UTC', fees: { maker: 0.02, taker: 0.05, type: 'PERCENTAGE' } },
    onUpdateProfile,
    exchanges = ['Binance', 'Bybit'],
    onUpdateExchanges,
    onEditFees,
    habitCompletions = {}
}) => {
    // --- State ---
    const [isEditing, setIsEditing] = useState(false);
    const [editProfile, setEditProfile] = useState(userProfile);
    const [newExchange, setNewExchange] = useState('');
    const [feeModalOpen, setFeeModalOpen] = useState(false);
    const [editingFeeExchange, setEditingFeeExchange] = useState<string | null>(null);
    const [tempFees, setTempFees] = useState({ maker: 0.1, taker: 0.1, type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED' });

    // File Refs for image upload
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const secondaryInputRef = useRef<HTMLInputElement>(null);

    // --- Calculations for RPG Stats ---
    const closedTrades = useMemo(() => trades.filter(t => t.status === TradeStatus.CLOSED), [trades]);
    const wins = closedTrades.filter(t => (t.pnl || 0) > 0);
    const totalTrades = closedTrades.length;

    // --- Public Analytics Logic ---
    const [analyticsTimeFilter, setAnalyticsTimeFilter] = useState<'7D' | '30D' | '90D' | 'ALL'>('ALL');

    const filteredAnalyticsTrades = useMemo(() => {
        const now = new Date();
        return closedTrades.filter(t => {
            if (analyticsTimeFilter === 'ALL') return true;
            const tradeDate = new Date(t.exitDate || t.entryDate);
            const daysDiff = (now.getTime() - tradeDate.getTime()) / (1000 * 3600 * 24);
            if (analyticsTimeFilter === '7D') return daysDiff <= 7;
            if (analyticsTimeFilter === '30D') return daysDiff <= 30;
            if (analyticsTimeFilter === '90D') return daysDiff <= 90;
            return true;
        }).sort((a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime());
    }, [closedTrades, analyticsTimeFilter]);

    const analyticsStats = useMemo(() => {
        const total = filteredAnalyticsTrades.length;
        const wins = filteredAnalyticsTrades.filter(t => (t.pnl || 0) > 0);
        const losses = filteredAnalyticsTrades.filter(t => (t.pnl || 0) <= 0);
        const winPnl = wins.reduce((acc, t) => acc + (t.pnl || 0), 0);
        const lossPnl = Math.abs(losses.reduce((acc, t) => acc + (t.pnl || 0), 0));

        const netPnl = winPnl - lossPnl;
        const winRate = total > 0 ? (wins.length / total) * 100 : 0;
        const pf = lossPnl > 0 ? winPnl / lossPnl : (winPnl > 0 ? 10 : 0);

        return { total, netPnl, winRate, pf };
    }, [filteredAnalyticsTrades]);

    const analyticsChartData = useMemo(() => {
        let runningPnl = 0;
        return filteredAnalyticsTrades.map(t => {
            runningPnl += (t.pnl || 0);
            return {
                date: new Date(t.exitDate || t.entryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                value: runningPnl
            };
        });
    }, [filteredAnalyticsTrades]);

    // 1. Physical (Win Rate) - Explicit User Request
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

    // 2. Psyche (Consistency / Journal Streak) - Explicit User Request
    // Calculate current journal streak from habitCompletions
    // Assuming habit ID for Journaling relates to 'Journal' or checking date continuity
    // Simplified: Count last 30 days journal entries or find max streak
    // Let's count total journal entries in last 30 days as a proxy for consistency score (0-100)
    // Actually, let's just count total 'true' values in last 30 days for any 'journal' key if we can identifying keys, 
    // or just pass 'journalStreak' if available. 
    // Let's infer roughly from habitCompletions keys. 
    // Since keys are `habitId_date`, we can count unique dates in last 30 days.
    const uniqueDates = new Set<string>();
    const now = new Date();
    Object.keys(habitCompletions).forEach(k => {
        if (habitCompletions[k]) {
            const parts = k.split('_');
            const dateStr = parts[1]; // YYYY-MM-DD
            // Check if within last 30 days
            const d = new Date(dateStr);
            const diffTime = Math.abs(now.getTime() - d.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) uniqueDates.add(dateStr);
        }
    });
    // Score: 30 days = 100%, 15 days = 50%
    const consistencyScore = Math.min(100, (uniqueDates.size / 30) * 100);
    const psyche = consistencyScore;

    // 3. Intel (Avg Win / Avg Loss - Realized R:R)
    const winsList = closedTrades.filter(t => (t.pnl || 0) > 0);
    const lossesList = closedTrades.filter(t => (t.pnl || 0) <= 0);
    const avgWin = winsList.length > 0 ? winsList.reduce((acc, t) => acc + (t.pnl || 0), 0) / winsList.length : 0;
    const avgLoss = lossesList.length > 0 ? Math.abs(lossesList.reduce((acc, t) => acc + (t.pnl || 0), 0)) / lossesList.length : 0;
    const realizedRR = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? 3 : 0);
    const intel = Math.min(100, (realizedRR / 2) * 100); // 2.0 Realized RR = 100%

    // 4. Craft (Profit Factor) - Explicit User Request -> Map 0-3 to 0-100
    const grossWin = wins.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const grossLoss = Math.abs(closedTrades.filter(t => (t.pnl || 0) <= 0).reduce((acc, t) => acc + (t.pnl || 0), 0));
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? 3 : 0);
    const craft = Math.min(100, (profitFactor / 2.5) * 100); // 2.5 PF = 100%

    // 5. Spiritual (Max Drawdown Reversed) - Explicit User Request -> 100 - DD%
    let currentEquity = 0;
    let peakEquity = 0;
    let maxDrawdownAbs = 0;

    // Sort trades by date for accurate equity curve
    const sortedTrades = [...closedTrades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

    sortedTrades.forEach(t => {
        currentEquity += (t.pnl || 0);
        if (currentEquity > peakEquity) peakEquity = currentEquity;
        const dd = peakEquity - currentEquity;
        if (dd > maxDrawdownAbs) maxDrawdownAbs = dd;
    });
    // If starting balance is unknown, assume 0 or just use relative drop
    // Assuming relative to Peak Equity if Peak > 0. If Peak <=0 (losing from start), DD is harder to define as %
    // Let's use maxDrawdownAbs / (PeakEquity + InitialCapital assumption or just PeakEquity if > 0)
    // Fallback: If peakEquity is 0 or negative, ANY loss is technically infinite DD % relative to 0.
    // Let's clamp at max loss % of total volume? No. 

    const dummyBase = 10000;
    const effectiveBase = peakEquity > 0 ? peakEquity : dummyBase;
    const maxDDPct = (maxDrawdownAbs / effectiveBase) * 100;
    // Score: 0% DD = 100 Score. 20% DD = 80 Score. >100% DD = 0 Score.
    const ddScore = Math.max(0, 100 - maxDDPct);

    const currentLevel = useMemo(() => getTraderLevel(profitFactor, maxDDPct, realizedRR), [profitFactor, maxDDPct, realizedRR]);

    // Stats Definitions (Exact User Request)
    const statsData = [
        { label: 'Win Rate', value: Math.round(winRate), displayValue: `${Math.round(winRate)}%`, color: 'bg-rose-500', fullMark: 100 },
        { label: 'Avg Win / Loss', value: Math.round(intel), displayValue: `${realizedRR.toFixed(2)}`, color: 'bg-blue-500', fullMark: 100 },
        { label: 'Profit Factor', value: Math.round(craft), displayValue: `${profitFactor.toFixed(2)}PF`, color: 'bg-emerald-500', fullMark: 100 },
        { label: 'Max Drawdown', value: Math.round(ddScore), displayValue: `${maxDDPct.toFixed(1)}%`, color: 'bg-cyan-500', fullMark: 100 },
        { label: 'Consistency', value: Math.round(psyche), displayValue: `${uniqueDates.size}/30`, color: 'bg-purple-500', fullMark: 100 },
    ];

    // Data for Radar Chart
    const radarChartData = statsData.map(stat => ({
        subject: stat.label,
        A: stat.value,
        fullMark: stat.fullMark
    }));

    // --- Handlers ---
    const [avatarKeyColor, setAvatarKeyColor] = useState<string>('rgba(79, 70, 229)');
    const [secondaryKeyColor, setSecondaryKeyColor] = useState<string>('rgba(16, 185, 129)');

    // Helper to extract dominant color from image
    const extractColor = async (imageSrc: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = imageSrc;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve('rgba(79, 70, 229)');

                canvas.width = 1;
                canvas.height = 1;
                ctx.drawImage(img, 0, 0, 1, 1);
                const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                resolve(`rgb(${r}, ${g}, ${b})`);
            };
            img.onerror = () => resolve('rgba(79, 70, 229)'); // Fallback
        });
    };

    React.useEffect(() => {
        if (userProfile.avatarImage) {
            extractColor(userProfile.avatarImage).then(setAvatarKeyColor);
        }
    }, [userProfile.avatarImage]);

    React.useEffect(() => {
        if (userProfile.secondaryImage) {
            extractColor(userProfile.secondaryImage).then(setSecondaryKeyColor);
        }
    }, [userProfile.secondaryImage]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatarImage' | 'bannerImage' | 'secondaryImage') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            if (base64.length > 5000000) {
                alert("Image too large! Please choose an image under 3MB.");
                return;
            }
            if (onUpdateProfile) {
                onUpdateProfile({ ...userProfile, [field]: base64 });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = () => {
        if (onUpdateProfile) onUpdateProfile(editProfile);
        setIsEditing(false);
    };

    const handleAddExchange = () => {
        if (newExchange.trim() && !exchanges.includes(newExchange.trim())) {
            const updated = [...exchanges, newExchange.trim()];
            if (onUpdateExchanges) onUpdateExchanges(updated);
            setNewExchange('');
        }
    };

    const handleDeleteExchange = (ex: string) => {
        if (ex === editProfile.primaryExchange) {
            alert("Cannot delete primary exchange.");
            return;
        }
        if (onUpdateExchanges) onUpdateExchanges(exchanges.filter(e => e !== ex));
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
            <style>
                {`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 0.1; }
                    50% { transform: scale(1.1); opacity: 0.2; }
                }
                `}
            </style>

            {/* TOP ROW: Banner & Avatar Area with Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">

                {/* LEFT COLUMN: Character Card (Avatar + Lists) */}
                <div className="lg:col-span-4 space-y-4">

                    {/* Character Card */}
                    <div
                        className="relative group rounded-xl bg-[#0B0E14] border border-slate-800 overflow-hidden shadow-2xl min-h-[500px] flex flex-col transition-all duration-1000"
                        style={{
                            boxShadow: `0 0 30px ${avatarKeyColor}20`,
                            borderColor: `${avatarKeyColor}40`
                        }}
                    >
                        {/* Animated Border Flow - Oversized Keyframe for full rotation coverage */}
                        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] z-0 opacity-100 pointer-events-none"
                            style={{
                                background: `conic-gradient(from 0deg, transparent 0%, ${avatarKeyColor || '#4f46e5'} 50%, transparent 100%)`,
                                animation: 'spin 4s linear infinite',
                                filter: 'blur(20px)'
                            }}
                        ></div>
                        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] z-0 opacity-80 pointer-events-none"
                            style={{
                                background: `conic-gradient(from 0deg, transparent 0%, ${avatarKeyColor || '#4f46e5'} 50%, transparent 100%)`,
                                animation: 'spin 4s linear infinite'
                            }}
                        ></div>

                        {/* Avatar Image Slot - Added margin to reveal border */}
                        <div className="relative flex-1 bg-[#151A25] min-h-[400px] z-10 m-[3px] rounded-lg overflow-hidden border border-slate-800/50">
                            {userProfile.avatarImage ? (
                                <img src={userProfile.avatarImage} alt="Avatar" className="w-full h-full object-cover absolute inset-0" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-600 flex-col gap-2">
                                    <i className="fa-solid fa-user-ninja text-6xl"></i>
                                    <span className="text-xs uppercase tracking-widest opacity-50">No Avatar Signal</span>
                                </div>
                            )}

                            {/* Upload Overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                                <button onClick={() => avatarInputRef.current?.click()} className="px-4 py-2 bg-white/10 backdrop-blur border border-white/20 rounded-full text-white text-xs font-bold hover:bg-white/20">
                                    <i className="fa-solid fa-camera mr-2"></i> Upload Avatar
                                </button>
                                <input type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'avatarImage')} />
                            </div>

                            {/* Name Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pt-12">
                                <h1 className="text-3xl font-black text-white tracking-tight uppercase" style={{ textShadow: '0 0 10px rgba(79, 70, 229, 0.5)' }}>
                                    {userProfile.nickname}
                                </h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded uppercase font-bold tracking-wider flex items-center gap-1">
                                        <i className="fa-solid fa-fire text-white"></i> {uniqueDates.size} Day Streak
                                    </span>
                                    <span className="text-xs text-indigo-300 font-mono tracking-wider uppercase border-l border-indigo-500/30 pl-2">
                                        {totalTrades} Trades Executed
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bio / Quote (Moved Up) */}
                    <div className="rounded-xl border border-slate-800 bg-[#0B0E14] p-6 relative overflow-hidden group">
                        {isEditing ? (
                            <div className="space-y-2">
                                <textarea
                                    value={editProfile.bio}
                                    onChange={(e) => setEditProfile({ ...editProfile, bio: e.target.value })}
                                    className="w-full bg-[#151A25] text-slate-300 text-sm p-3 rounded border border-slate-700 focus:border-indigo-500 outline-none h-24 resize-none font-mono"
                                    placeholder="Enter your system manifesto..."
                                />
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setIsEditing(false)} className="text-xs text-slate-500 hover:text-white">Cancel</button>
                                    <button onClick={handleSaveProfile} className="text-xs text-indigo-400 hover:text-indigo-300 font-bold">Save Bio</button>
                                </div>
                            </div>
                        ) : (
                            <div className="relative z-10 cursor-pointer" onClick={() => { setIsEditing(true); setEditProfile(userProfile); }}>
                                <i className="fa-solid fa-quote-left text-slate-700 text-4xl absolute -top-2 -left-2 opacity-50"></i>
                                <p className="text-sm font-mono text-indigo-200/80 leading-relaxed pl-6 italic">
                                    "{userProfile.bio || "No system manifesto uploaded."}"
                                </p>
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center backdrop-blur-[1px] transition-opacity">
                                    <span className="text-xs font-bold text-white"><i className="fa-solid fa-pen mr-1"></i> Edit Manifesto</span>
                                </div>
                            </div>
                        )}

                        {/* Vyuha ID - Hacker Code Theme */}
                        <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between group/id">
                            <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">ID Signature</div>
                            <div className="font-mono text-xs text-lime-400 bg-black/60 border border-lime-500/30 px-3 py-1 rounded shadow-[0_0_10px_rgba(132,204,22,0.1)] flex items-center gap-2 group-hover/id:shadow-[0_0_15px_rgba(132,204,22,0.2)] transition-shadow">
                                <i className="fa-solid fa-fingerprint animate-pulse"></i>
                                <span>VYUHA-{userProfile.nickname.toUpperCase().substring(0, 3)}-{Math.floor(Math.random() * 1000).toString().padStart(3, '0')}X</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats List (Moved Down) */}
                    <div className="rounded-xl border border-slate-800 bg-[#0B0E14] p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <i className="fa-solid fa-chart-simple text-indigo-500"></i>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Performance Stats</h3>
                        </div>

                        {statsData.map((stat) => (
                            <StatBar
                                key={stat.label}
                                label={stat.label}
                                value={stat.value}
                                displayValue={stat.displayValue}
                                color={stat.color}
                            />
                        ))}

                        <div className="pt-4 mt-4 border-t border-slate-800 flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Rank</span>
                                <span className={`text-sm font-black uppercase tracking-wider ${currentLevel.color} drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`}>
                                    {currentLevel.name}
                                </span>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className="text-[10px] text-slate-600 font-mono italic">{currentLevel.desc}</span>
                                <span className="text-[10px] text-slate-500 font-mono">SUM: {Math.round(statsData.reduce((acc, s) => acc + s.value, 0))}</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN: Radar + Vibe Slot */}
                <div className="lg:col-span-8 flex flex-col gap-6">

                    {/* Banner / Radar Hybrid Container */}
                    <div className="rounded-xl border border-slate-800 bg-[#0B0E14] overflow-hidden min-h-[400px] flex flex-col md:flex-row relative">

                        {/* Radar Chart Section */}
                        <div className="flex-1 p-6 flex flex-col items-center justify-center relative bg-[#0B0E14]">
                            <div className="absolute top-4 left-4 flex items-center gap-2">
                                <i className="fa-solid fa-star text-yellow-500 animate-pulse"></i>
                                <h3 className="text-lg font-bold text-white tracking-widest uppercase" style={{ fontFamily: 'Courier New' }}>Skill Radar</h3>
                            </div>

                            <div className="w-full h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                                        <PolarGrid stroke="#334155" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar
                                            name="Stats"
                                            dataKey="A"
                                            stroke="#ec4899"
                                            strokeWidth={2}
                                            fill="#ec4899"
                                            fillOpacity={0.2}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                                            itemStyle={{ color: '#ec4899' }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="absolute bottom-4 right-4 text-[10px] text-slate-600 flex items-center gap-1">
                                <i className="fa-solid fa-bolt text-yellow-500"></i> Powered by Vyuha
                            </div>
                        </div>

                        {/* Vibe/Scene Image Slot (Secondary) */}
                        <div
                            className="flex-1 relative bg-[#0f1219] min-h-[300px] md:min-h-auto group border-t md:border-t-0 md:border-l border-slate-800 transition-all duration-1000 overflow-hidden"
                            style={{
                                boxShadow: `inset 0 0 20px ${secondaryKeyColor}20`,
                                borderColor: `${secondaryKeyColor}40`,
                                borderWidth: '1px' // Ensure border is visible
                            }}
                        >
                            {/* Rotating Border Effect for Scenario */}
                            <div className="absolute -inset-[100%] z-0 opacity-30 pointer-events-none"
                                style={{
                                    background: `conic-gradient(from 0deg, transparent 0%, ${secondaryKeyColor} 50%, transparent 100%)`,
                                    animation: 'spin 10s linear infinite',
                                    filter: 'blur(20px)'
                                }}
                            ></div>

                            {/* Inner Flow Animation */}
                            <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-screen z-10"
                                style={{
                                    background: `radial-gradient(circle at 50% 50%, ${secondaryKeyColor}, transparent 80%)`,
                                    animation: 'pulse 4s ease-in-out infinite'
                                }}
                            ></div>

                            {userProfile.secondaryImage ? (
                                <img src={userProfile.secondaryImage} className="w-full h-full object-cover absolute inset-0 opacity-80 group-hover:opacity-40 transition-opacity" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center flex-col gap-2 text-slate-700">
                                    <i className="fa-solid fa-mountain-sun text-4xl"></i>
                                    <span className="text-xs uppercase tracking-widest font-mono">No Scenario Loaded</span>
                                </div>
                            )}

                            <div className="absolute top-4 left-4 z-10">
                                <h3 className="text-lg font-bold text-indigo-400 font-mono">Trading Setup</h3>
                                <div className="flex gap-1 mt-1">
                                    <i className="fa-solid fa-star text-[10px] text-yellow-500"></i>
                                    <i className="fa-solid fa-star text-[10px] text-yellow-500"></i>
                                    <i className="fa-solid fa-star text-[10px] text-yellow-500"></i>
                                </div>
                            </div>

                            {/* Upload Button */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <button onClick={() => secondaryInputRef.current?.click()} className="px-4 py-2 border border-indigo-500/50 text-indigo-400 rounded hover:bg-indigo-500/10 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                                    Choose Setup Photo
                                </button>
                                <input type="file" ref={secondaryInputRef} accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'secondaryImage')} />
                            </div>

                            {/* Glitch Overlay Text */}
                            <div className="absolute bottom-8 right-8 text-right pointer-events-none mix-blend-overlay opacity-80">
                                <p className="font-mono text-4xl font-bold text-pink-500 blur-[0.5px]">WHY IS</p>
                                <p className="font-mono text-2xl font-bold text-blue-500 blur-[0.5px]">THE UNKNOWN</p>
                                <p className="font-mono text-xl font-bold text-white blur-[0.5px]">SO FAMILIAR?</p>
                            </div>
                        </div>
                    </div>

                    {/* Banner Slot (Bottom Wide) */}
                    <div className="relative group h-32 rounded-xl border border-slate-800 bg-[#0B0E14] overflow-hidden flex-shrink-0">
                        {userProfile.bannerImage ? (
                            <img src={userProfile.bannerImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-10">
                                <span className="text-slate-600 uppercase tracking-[0.5em] text-xs">Banner Signal Lost</span>
                            </div>
                        )}

                        <div className="absolute top-4 left-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-l-2 border-indigo-500 pl-2">Profile Settings</h3>
                        </div>

                        {/* Config Buttons Overlay */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-4 z-20">
                            <button
                                onClick={() => {
                                    setEditingFeeExchange(userProfile.primaryExchange);
                                    setTempFees(userProfile.fees);
                                    setFeeModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-indigo-600/80 border border-slate-700 hover:border-indigo-500 rounded-lg text-slate-300 hover:text-white transition-all backdrop-blur-sm group/btn"
                            >
                                <i className="fa-solid fa-percent group-hover/btn:rotate-12 transition-transform"></i>
                                <span className="text-xs font-bold uppercase">Fee Settings</span>
                            </button>

                            <button
                                onClick={() => bannerInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-emerald-600/80 border border-slate-700 hover:border-emerald-500 rounded-lg text-slate-300 hover:text-white transition-all backdrop-blur-sm"
                            >
                                <i className="fa-regular fa-image"></i>
                                <span className="text-xs font-bold uppercase">Set Banner</span>
                            </button>
                            <input type="file" ref={bannerInputRef} accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'bannerImage')} />
                        </div>
                    </div>

                    {/* PUBLIC PERFORMANCE ANALYTICS SECTION (Moved & Compacted) */}
                    <div className="flex-1 rounded-xl border border-slate-800 bg-[#0B0E14] p-4 flex flex-col min-h-[300px]">
                        <div className="flex flex-row justify-between items-center gap-4 mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
                                    <i className="fa-solid fa-chart-line text-indigo-500"></i> Public Performance
                                </h3>
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Verified on-chain performance metrics</p>
                            </div>
                            <div className="flex bg-[#151A25] p-0.5 rounded-lg border border-slate-800 scale-90 origin-right">
                                {['7D', '30D', '90D', 'ALL'].map((tf) => (
                                    <button
                                        key={tf}
                                        onClick={() => setAnalyticsTimeFilter(tf as any)}
                                        className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${analyticsTimeFilter === tf ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {tf}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-3 mb-4">
                            <div className="p-3 rounded bg-[#151A25] border border-slate-800">
                                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-0.5">Net PnL</span>
                                <span className={`text-base font-mono font-bold ${analyticsStats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {analyticsStats.netPnl >= 0 ? '+' : ''}{formatCurrency(analyticsStats.netPnl)}
                                </span>
                            </div>
                            <div className="p-3 rounded bg-[#151A25] border border-slate-800">
                                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-0.5">Win Rate</span>
                                <span className="text-base font-mono font-bold text-white">
                                    {analyticsStats.winRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="p-3 rounded bg-[#151A25] border border-slate-800">
                                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-0.5">Profit Factor</span>
                                <span className={`text-base font-mono font-bold ${analyticsStats.pf >= 1.5 ? 'text-emerald-400' : 'text-white'}`}>
                                    {analyticsStats.pf.toFixed(2)}
                                </span>
                            </div>
                            <div className="p-3 rounded bg-[#151A25] border border-slate-800">
                                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-0.5">Total Trades</span>
                                <span className="text-base font-mono font-bold text-white">
                                    {analyticsStats.total}
                                </span>
                            </div>
                        </div>

                        {/* Equity Chart - Fills remaining space */}
                        <div className="flex-1 w-full bg-[#151A25]/30 rounded border border-slate-800/50 p-2 relative min-h-[200px]">
                            <h4 className="absolute top-2 left-2 text-[9px] font-bold text-slate-500 uppercase z-10">Equity Curve</h4>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analyticsChartData}>
                                    <defs>
                                        <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="date" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} minTickGap={30} />
                                    <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', fontSize: '11px' }}
                                        itemStyle={{ color: '#8b5cf6' }}
                                        formatter={(value: number) => [formatCurrency(value), 'PnL']}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorPnl)" />
                                </AreaChart>
                            </ResponsiveContainer>
                            {analyticsStats.total === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded">
                                    <span className="text-xs text-slate-400 font-mono">No trades in selected period</span>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Fee Config Modal (Reused) */}
            {feeModalOpen && editingFeeExchange && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-[#0B0E14] rounded-2xl border border-slate-800 shadow-2xl p-6 relative">
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-indigo-500"></div>
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500"></div>
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-indigo-500"></div>
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-indigo-500"></div>

                        <h3 className="text-lg font-bold text-white mb-1 font-mono uppercase">Fee Matrix</h3>
                        <p className="text-xs text-indigo-400 mb-6 font-mono"> Configuring node: {editingFeeExchange} </p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block tracking-wider">Maker Rate</label>
                                <div className="flex items-center bg-[#151A25] border border-slate-700 rounded px-3">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={tempFees.maker}
                                        onChange={(e) => setTempFees({ ...tempFees, maker: parseFloat(e.target.value) })}
                                        className="w-full bg-transparent py-2 text-white outline-none font-mono text-sm"
                                    />
                                    <span className="text-slate-500 text-xs">%</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block tracking-wider">Taker Rate</label>
                                <div className="flex items-center bg-[#151A25] border border-slate-700 rounded px-3">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={tempFees.taker}
                                        onChange={(e) => setTempFees({ ...tempFees, taker: parseFloat(e.target.value) })}
                                        className="w-full bg-transparent py-2 text-white outline-none font-mono text-sm"
                                    />
                                    <span className="text-slate-500 text-xs">%</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <button
                                    onClick={() => setFeeModalOpen(false)}
                                    className="py-2 rounded border border-slate-700 text-slate-400 hover:text-white text-xs font-bold uppercase"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (onUpdateProfile) {
                                            onUpdateProfile({
                                                ...userProfile!,
                                                fees: editingFeeExchange === userProfile?.primaryExchange ? tempFees : userProfile!.fees,
                                                exchangeFees: { ...userProfile?.exchangeFees, [editingFeeExchange]: tempFees }
                                            });
                                        }
                                        setFeeModalOpen(false);
                                    }}
                                    className="py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase shadow-lg shadow-indigo-500/20"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub-components ---
const StatBar = ({ label, value, color, displayValue }: { label: string, value: number, color: string, displayValue?: string }) => (
    <div className="group">
        <div className="flex justify-between items-end mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">{label}</span>
            <span className="text-xs font-mono font-bold text-white">{displayValue || value}</span>
        </div>
        <div className="h-1.5 w-full bg-[#151A25] rounded-sm overflow-hidden border border-slate-800/50">
            <div
                className={`h-full ${color} shadow-[0_0_10px_currentColor] transition-all duration-1000 ease-out`}
                style={{ width: `${value}%`, opacity: 0.8 }}
            ></div>
        </div>
    </div>
);

// Helper for currency formatting
const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
};

export default Profile;
