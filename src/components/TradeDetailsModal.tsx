
import React from 'react';
import { Trade, TradeStatus, getCurrencyFormatter, FeeConfig, TradeSide } from '../types';

interface TradeDetailsModalProps {
    trade: Trade;
    onClose: () => void;
    baseCurrency: string;
    userFees?: FeeConfig;
}

const TradeDetailsModal: React.FC<TradeDetailsModalProps> = ({ trade, onClose, baseCurrency, userFees }) => {
    const currency = getCurrencyFormatter(baseCurrency);

    // Calculate estimated fees if not explicitly stored
    let estimatedFees = 0;
    if (userFees) {
        const rate = userFees.taker ? userFees.taker / 100 : 0.0005;
        const isFixed = userFees.type === 'FIXED';
        const fixedFee = userFees.taker || 0;

        const entryVol = trade.entryPrice * trade.quantity;
        const exitVol = (trade.exitPrice || trade.entryPrice) * trade.quantity;

        if (isFixed) {
            estimatedFees = fixedFee * 2;
        } else {
            estimatedFees = (entryVol * rate) + (exitVol * rate);
        }
    }

    const netPnl = (trade.pnl || 0) - estimatedFees;
    const isWin = (trade.pnl || 0) > 0;
    const durationStr = (() => {
        const start = new Date(trade.entryDate).getTime();
        const end = trade.exitDate ? new Date(trade.exitDate).getTime() : Date.now();
        const diff = end - start;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${mins}m`;
    })();

    // For trades missing exitPrice (e.g. from old CSV imports)
    let displayedExitPrice = trade.exitPrice;
    if (!displayedExitPrice && trade.status === TradeStatus.CLOSED && trade.quantity > 0) {
        if (trade.side === TradeSide.LONG) {
            displayedExitPrice = trade.entryPrice + ((trade.pnl || 0) / trade.quantity);
        } else {
            displayedExitPrice = trade.entryPrice - ((trade.pnl || 0) / trade.quantity);
        }
    }

    // Derived ROI if missing or zero (but PnL is non-zero)
    const displayedROI = trade.pnlPercentage ||
        ((trade.entryPrice > 0 && trade.quantity > 0) ? ((trade.pnl || 0) / (trade.entryPrice * trade.quantity)) * 100 : 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-3xl bg-[#0B0E14] rounded-2xl border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 p-6 bg-[#151A25] shrink-0 rounded-t-2xl">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-[#0B0E14] border border-slate-700 flex items-center justify-center text-white font-bold text-lg">
                            {trade.symbol.substring(0, 3)}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {trade.symbol}
                                <span className={`text-[10px] px-2 py-0.5 rounded border ${trade.side === TradeSide.LONG ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                                    {trade.side}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded border ${trade.status === TradeStatus.OPEN ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    {trade.status}
                                </span>
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">{new Date(trade.entryDate).toLocaleString()}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[#0B0E14]">

                    {/* KPI Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-[#151A25] border border-slate-800">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Gross P&L</p>
                            <p className={`text-xl font-bold font-mono ${isWin ? 'text-emerald-400' : (trade.pnl || 0) < 0 ? 'text-rose-400' : 'text-white'}`}>
                                {trade.pnl ? currency.format(trade.pnl) : '--'}
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-[#151A25] border border-slate-800">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Est. Fees</p>
                            <p className="text-xl font-bold font-mono text-slate-300">
                                {currency.format(estimatedFees)}
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-[#151A25] border border-slate-800">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Net P&L</p>
                            <p className={`text-xl font-bold font-mono ${netPnl > 0 ? 'text-emerald-400' : netPnl < 0 ? 'text-rose-400' : 'text-white'}`}>
                                {trade.pnl ? currency.format(netPnl) : '--'}
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-[#151A25] border border-slate-800">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">ROI</p>
                            <p className={`text-xl font-bold font-mono ${isWin ? 'text-emerald-400' : (trade.pnlPercentage || 0) < 0 ? 'text-rose-400' : 'text-white'}`}>
                                {displayedROI ? `${displayedROI.toFixed(2)}%` : '--'}
                            </p>
                        </div>
                    </div>

                    {/* Execution Details */}
                    <div>
                        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <i className="fa-solid fa-crosshairs text-indigo-400"></i> Execution
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 rounded-xl border border-slate-800 bg-[#151A25]/50 p-6">
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-xs text-slate-500">Entry Price</span>
                                    <span className="text-sm font-mono text-white">{trade.entryPrice}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-slate-500">Exit Price</span>
                                    <span className="text-sm font-mono text-white">{displayedExitPrice || '--'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-slate-500">Quantity</span>
                                    <span className="text-sm font-mono text-white">{trade.quantity}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-slate-500">Leverage</span>
                                    <span className="text-sm font-mono text-amber-400">{trade.leverage}x</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-xs text-slate-500">Position Size</span>
                                    <span className="text-sm font-mono text-white">{currency.format(trade.capital * trade.leverage)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-slate-500">Margin</span>
                                    <span className="text-sm font-mono text-white">{currency.format(trade.capital)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-slate-500">Duration</span>
                                    <span className="text-sm font-mono text-white">{durationStr}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">Quality</span>
                                    <div className="flex gap-0.5">
                                        {trade.exitQuality ? (
                                            [1, 2, 3, 4, 5].map(star => (
                                                <i
                                                    key={star}
                                                    className={`text-xs fa-star ${star <= trade.exitQuality! ? 'fa-solid text-yellow-400' : 'fa-regular text-slate-700'}`}
                                                ></i>
                                            ))
                                        ) : <span className="text-xs text-slate-600">-</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tags & Setups */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-bold text-white mb-3">Setups & Rules</h4>
                            <div className="flex flex-wrap gap-2">
                                {trade.strategy && (
                                    <span className="w-full px-2.5 py-1 rounded bg-indigo-500/20 border border-indigo-500/30 text-xs text-indigo-400 font-bold mb-1">
                                        Strategy: {trade.strategy}
                                    </span>
                                )}
                                {trade.setups && trade.setups.length > 0 && trade.setups.map((s, i) => (
                                    <span key={i} className="px-2.5 py-1 rounded bg-[#1E2330] border border-slate-700 text-xs text-slate-300">
                                        {s}
                                    </span>
                                ))}
                                {trade.entryChecklist && trade.entryChecklist.length > 0 && (
                                    <div className="w-full mt-2 space-y-1">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Entry Checklist</p>
                                        <div className="flex flex-wrap gap-1">
                                            {trade.entryChecklist.map((c, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">
                                                    <i className="fa-solid fa-check mr-1"></i> {c}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {trade.exitChecklist && trade.exitChecklist.length > 0 && (
                                    <div className="w-full mt-2 space-y-1">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Exit Checklist</p>
                                        <div className="flex flex-wrap gap-1">
                                            {trade.exitChecklist.map((c, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400">
                                                    <i className="fa-solid fa-check mr-1"></i> {c}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {(!trade.setups?.length && !trade.entryChecklist?.length && !trade.exitChecklist?.length) && (
                                    <span className="text-xs text-slate-600 italic">No rules recorded</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white mb-3">Tags</h4>
                            <div className="flex flex-wrap gap-2">
                                {[...(trade.entryReasons || []), ...(trade.mentalState || []), ...(trade.tags || [])].map((tag, i) => (
                                    <span key={i} className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300">
                                        {tag}
                                    </span>
                                ))}
                                {(!trade.entryReasons?.length && !trade.mentalState?.length && !trade.tags?.length) && (
                                    <span className="text-xs text-slate-600 italic">No tags recorded</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <h4 className="text-sm font-bold text-white mb-3">Journal Notes</h4>
                        <div className="rounded-xl border border-slate-800 bg-[#151A25] p-4 min-h-[100px]">
                            <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                                {trade.notes || "No notes for this trade."}
                            </p>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-[#151A25] rounded-b-2xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                    >
                        Close View
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TradeDetailsModal;
