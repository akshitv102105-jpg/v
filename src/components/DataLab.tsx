
import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Trade } from '../types';

interface DataLabProps {
    trades?: Trade[];
    onSeekWisdom?: (data: any) => void;
    onDeleteTrade?: (id: string) => void;
}

const DataLab: React.FC<DataLabProps> = ({ trades = [], onSeekWisdom, onDeleteTrade }) => {
    // View State
    const [view, setView] = useState<'simulation' | 'backtest'>('simulation');

    // Inputs
    const [startCapital, setStartCapital] = useState<number>(10000);
    const [winRate, setWinRate] = useState<number>(50);
    const [riskReward, setRiskReward] = useState<number>(2);
    const [riskPerTrade, setRiskPerTrade] = useState<number>(1);
    const [numTrades, setNumTrades] = useState<number>(100);
    const [numSimulations, setNumSimulations] = useState<number>(20);

    // Results
    const [simulationData, setSimulationData] = useState<any[]>([]);
    const [stats, setStats] = useState({
        avgEndingBalance: 0,
        bestRun: 0,
        worstRun: 0,
        ruinProbability: 0
    });

    const runSimulation = () => {
        const sims: any[] = []; // Array of trade points { trade: 1, run0: 10000, run1: 10000 ... }
        let endings: number[] = [];
        let ruins = 0;

        // Initialize data structure
        for (let t = 0; t <= numTrades; t++) {
            sims.push({ trade: t });
        }

        // Run Monte Carlo
        for (let s = 0; s < numSimulations; s++) {
            let balance = startCapital;
            let isRuined = false;
            sims[0][`run${s}`] = balance;

            for (let t = 1; t <= numTrades; t++) {
                if (balance <= 0) {
                    balance = 0;
                    isRuined = true;
                } else {
                    const isWin = Math.random() * 100 < winRate;
                    const riskAmt = balance * (riskPerTrade / 100);
                    if (isWin) {
                        balance += riskAmt * riskReward;
                    } else {
                        balance -= riskAmt;
                    }
                }
                sims[t][`run${s}`] = Math.round(balance);
            }
            endings.push(balance);
            if (isRuined) ruins++;
        }

        setSimulationData(sims);
        setStats({
            avgEndingBalance: endings.reduce((a, b) => a + b, 0) / numSimulations,
            bestRun: Math.max(...endings),
            worstRun: Math.min(...endings),
            ruinProbability: (ruins / numSimulations) * 100
        });
    };

    // Auto-run on mount
    useEffect(() => {
        runSimulation();
    }, []); // eslint-disable-line

    // Backtest Data Stats
    const backtestStats = useMemo(() => {
        const dataTrades = trades.filter(t => t.tradeType === 'DATA');
        const count = dataTrades.length;
        const wins = dataTrades.filter(t => (t.pnl || 0) > 0).length;
        const wr = count > 0 ? (wins / count) * 100 : 0;
        const netPnl = dataTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

        const winningTrades = dataTrades.filter(t => (t.pnl || 0) > 0);
        const losingTrades = dataTrades.filter(t => (t.pnl || 0) < 0);

        const grossProfit = winningTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
        const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + (t.pnl || 0), 0));
        const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

        const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
        const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
        const realizedRR = avgLoss > 0 ? avgWin / avgLoss : 0;

        const expectancy = count > 0 ? netPnl / count : 0;

        // Max Drawdown Calculation
        let peak = 0;
        let runningPnl = 0;
        let maxDD = 0;
        // Sort by date ascending
        const sortedTrades = [...dataTrades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

        for (const t of sortedTrades) {
            runningPnl += (t.pnl || 0);
            if (runningPnl > peak) peak = runningPnl;
            const dd = peak - runningPnl;
            if (dd > maxDD) maxDD = dd;
        }

        return { count, wr, netPnl, realizedRR, profitFactor, maxDD, expectancy, avgWin, avgLoss, dataTrades };
    }, [trades]);

    const handleSeekAdvice = () => {
        if (!onSeekWisdom) return;

        const analysisData = {
            period: 'DATA_SESSION',
            tradeCount: backtestStats.count,
            winRate: backtestStats.wr,
            profitFactor: backtestStats.profitFactor,
            expectancy: backtestStats.expectancy,
            netPnL: backtestStats.netPnl,
            avgWin: backtestStats.avgWin,
            avgLoss: backtestStats.avgLoss,
            maxDrawdown: backtestStats.maxDD,
            trades: backtestStats.dataTrades.map(t => ({
                symbol: t.symbol,
                side: t.side,
                pnl: t.pnl,
                date: t.entryDate,
                strategy: t.strategy,
                tags: []
            })),
            deepDive: {}
        };
        onSeekWisdom(analysisData);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12 h-screen flex flex-col">
            <div className="shrink-0 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                            <i className="fa-solid fa-flask text-indigo-400"></i>
                        </div>
                        <h1 className="text-3xl font-bold text-white">Data Lab</h1>
                    </div>
                </div>

                {/* View Switcher */}
                <div className="flex gap-4">
                    {view === 'backtest' && (
                        <button
                            onClick={handleSeekAdvice}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-sm font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all hover:scale-105"
                        >
                            <i className="fa-solid fa-wand-magic-sparkles"></i> Seek Wisdom
                        </button>
                    )}

                    <div className="flex bg-[#151A25] p-1 rounded-lg border border-slate-800">
                        <button
                            onClick={() => setView('simulation')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${view === 'simulation' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Monte Carlo
                        </button>
                        <button
                            onClick={() => setView('backtest')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${view === 'backtest' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Backtest Log
                        </button>
                    </div>
                </div>
            </div>

            {view === 'simulation' ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
                    {/* Sidebar: Controls */}
                    <div className="lg:col-span-1 rounded-2xl border border-slate-800 bg-[#151A25] p-6 overflow-y-auto">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <i className="fa-solid fa-sliders text-slate-400"></i> Parameters
                        </h3>

                        <div className="space-y-6">
                            <InputGroup
                                label="Starting Capital ($)"
                                value={startCapital}
                                onChange={(v: number) => setStartCapital(v)}
                                step={100}
                            />
                            <InputGroup
                                label="Win Rate (%)"
                                value={winRate}
                                onChange={(v: number) => setWinRate(v)}
                                min={1} max={99}
                            />
                            <InputGroup
                                label="Risk : Reward (1 : X)"
                                value={riskReward}
                                onChange={(v: number) => setRiskReward(v)}
                                step={0.1}
                            />
                            <InputGroup
                                label="Risk Per Trade (%)"
                                value={riskPerTrade}
                                onChange={(v: number) => setRiskPerTrade(v)}
                                step={0.1}
                            />
                            <InputGroup
                                label="Number of Trades"
                                value={numTrades}
                                onChange={(v: number) => setNumTrades(v)}
                                step={10} max={1000}
                            />

                            <button
                                onClick={runSimulation}
                                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all hover:scale-[1.02]"
                            >
                                <i className="fa-solid fa-play mr-2"></i> Run Monte Carlo
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase">Stats Prediction</h4>
                            <StatRow label="Expectancy (Per Trade)" value={`${((winRate / 100 * riskReward) - ((100 - winRate) / 100 * 1)).toFixed(2)}R`} />
                            <StatRow label="Break Even Win Rate" value={`${(100 / (1 + riskReward)).toFixed(1)}%`} />
                        </div>
                    </div>

                    {/* Main: Charts */}
                    <div className="lg:col-span-3 flex flex-col gap-6 min-h-0">
                        {/* Stats Boxes */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                            <SimStatBox label="Avg Ending Balance" value={`$${Math.round(stats.avgEndingBalance).toLocaleString()}`} />
                            <SimStatBox label="Best Run" value={`$${Math.round(stats.bestRun).toLocaleString()}`} color="text-emerald-400" />
                            <SimStatBox label="Worst Run" value={`$${Math.round(stats.worstRun).toLocaleString()}`} color="text-rose-400" />
                            <SimStatBox
                                label="Probability of Ruin"
                                value={`${stats.ruinProbability.toFixed(1)}%`}
                                color={stats.ruinProbability > 0 ? 'text-rose-500' : 'text-emerald-500'}
                            />
                        </div>

                        {/* Chart */}
                        <div className="flex-1 rounded-2xl border border-slate-800 bg-[#151A25] p-6 min-h-[400px]">
                            <div className="h-full w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={simulationData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis dataKey="trade" stroke="#64748b" style={{ fontSize: '12px' }} />
                                        <YAxis stroke="#64748b" style={{ fontSize: '12px' }} tickFormatter={(val) => `$${val / 1000}k`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
                                            formatter={(val: number) => [`$${Math.round(val).toLocaleString()}`, 'Balance']}
                                            labelFormatter={(label) => `Trade ${label}`}
                                        />
                                        <ReferenceLine y={startCapital} stroke="#64748b" strokeDasharray="3 3" />
                                        {Array.from({ length: numSimulations }).map((_, i) => (
                                            <Line
                                                key={i}
                                                type="monotone"
                                                dataKey={`run${i}`}
                                                stroke={`hsl(${220 + (i * 130 / numSimulations)}, 70%, 60%)`}
                                                strokeWidth={1}
                                                dot={false}
                                                strokeOpacity={0.6}
                                                activeDot={{ r: 4 }}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in duration-300 space-y-6">
                    {/* Primary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SimStatBox label="Data Trades" value={backtestStats.count.toString()} />
                        <SimStatBox label="Win Rate" value={`${backtestStats.wr.toFixed(1)}%`} color={backtestStats.wr >= 50 ? 'text-emerald-400' : 'text-rose-400'} />
                        <SimStatBox label="Net PnL" value={`$${backtestStats.netPnl.toFixed(2)}`} color={backtestStats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
                        <SimStatBox label="Realized R:R" value={`1:${backtestStats.realizedRR.toFixed(2)}`} color="text-indigo-400" />
                    </div>

                    {/* Advanced Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SimStatBox label="Profit Factor" value={backtestStats.profitFactor.toFixed(2)} color={backtestStats.profitFactor >= 1.5 ? 'text-emerald-400' : (backtestStats.profitFactor >= 1 ? 'text-amber-400' : 'text-rose-400')} />
                        <SimStatBox label="Expectancy" value={`$${backtestStats.expectancy.toFixed(2)}`} color={backtestStats.expectancy > 0 ? 'text-emerald-400' : 'text-rose-400'} />
                        <SimStatBox label="Max Drawdown" value={`-$${Math.abs(backtestStats.maxDD).toFixed(2)}`} color="text-rose-500" />
                        <SimStatBox label="Avg Win / Loss" value={`$${backtestStats.avgWin.toFixed(0)} / $${backtestStats.avgLoss.toFixed(0)}`} color="text-slate-300" />
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-[#151A25] p-6 overflow-hidden">
                        <h3 className="text-lg font-bold text-white mb-4">Backtest Session Log</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#0B0E14] text-slate-400">
                                    <tr>
                                        <th className="px-4 py-3 rounded-l-lg">Date</th>
                                        <th className="px-4 py-3">Symbol</th>
                                        <th className="px-4 py-3">Side</th>
                                        <th className="px-4 py-3">Setup</th>
                                        <th className="px-4 py-3 text-right">Entry</th>
                                        <th className="px-4 py-3 text-right">Exit</th>
                                        <th className="px-4 py-3 text-right">PnL</th>
                                        <th className="px-4 py-3 text-right rounded-r-lg">R:R</th>
                                        <th className="px-4 py-3 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {backtestStats.dataTrades.slice().reverse().map(t => (
                                        <tr key={t.id} className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-4 py-3 text-slate-400">{new Date(t.entryDate).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 font-bold text-white">{t.symbol}</td>
                                            <td className={`px-4 py-3 font-bold ${t.side === 'LONG' ? 'text-emerald-500' : 'text-rose-500'}`}>{t.side}</td>
                                            <td className="px-4 py-3 text-slate-300">{t.strategy || '-'}</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-300">{t.entryPrice}</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-300">{t.exitPrice || '-'}</td>
                                            <td className={`px-4 py-3 text-right font-mono font-bold ${Number(t.pnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {t.pnl ? `$${t.pnl.toFixed(2)}` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-indigo-300">{t.riskReward ? `${t.riskReward}R` : '-'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => onDeleteTrade && onDeleteTrade(t.id)}
                                                    className="text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                                                    title="Delete Data Trade"
                                                >
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {backtestStats.dataTrades.length === 0 && (
                                        <tr><td colSpan={9} className="text-center py-8 text-slate-500 italic">No backtest trades recorded yet. Use the 'Data Study' mode in the Trade Form.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub-components
const InputGroup = ({ label, value, onChange, step = 1, min = 0, max = 1000000 }: { label: string, value: number, onChange: (v: number) => void, step?: number, min?: number, max?: number }) => (
    <div>
        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">{label}</label>
        <input
            type="number"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            step={step} min={min} max={max}
            className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-indigo-500 outline-none"
        />
    </div>
);

const StatRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="font-bold text-white font-mono">{value}</span>
    </div>
);

const SimStatBox = ({ label, value, color = 'text-white' }: { label: string, value: string, color?: string }) => (
    <div className="bg-[#151A25] border border-slate-800 rounded-xl p-4">
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">{label}</p>
        <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
    </div>
);

export default DataLab;
