
import React, { useRef } from 'react';
import Papa from 'papaparse';
import { Trade, TradeStatus, TradeSide, UserProfile } from '../types';
import { DataMigration } from './DataMigration';

interface SettingsProps {
    userProfile: UserProfile;
    onUpdateProfile: (profile: UserProfile) => void;
    onImportTrades: (trades: Trade[]) => void;
    trades: Trade[];
    onClearTrades?: () => void;
    onClearImportedTrades?: () => void;
}

const Settings: React.FC<SettingsProps> = ({
    userProfile, onUpdateProfile, onImportTrades, trades, onClearTrades, onClearImportedTrades
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Handlers for Data ---
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const { trades: parsedTrades, errors } = processParsedData(results.data, results.meta.fields || []);
                if (parsedTrades.length > 0) {
                    onImportTrades(parsedTrades);
                    alert(`Successfully imported ${parsedTrades.length} trades.`);
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
        // ... (Reuse existing parsing logic, maybe extract to utility later)
        const headers = fields.map(h => h.toLowerCase().trim());
        const findCol = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h === k || h.includes(k)));

        const dateIdx = findCol(['time', 'date', 'created', 'timestamp', 'datetime']);
        const symbolIdx = findCol(['contract', 'symbol', 'pair', 'instrument', 'ticker', 'market', 'currency pair', 'item']);
        const sideIdx = findCol(['side', 'type', 'direction', 'action']);
        const priceIdx = findCol(['exec.price', 'price', 'avg', 'entry', 'fill', 'avg price']);
        const qtyIdx = findCol(['qty', 'quantity', 'amount', 'size', 'volume', 'executed']);
        const pnlIdx = findCol(['realised p&l', 'pnl', 'profit', 'roe', 'realized']);
        const feeIdx = findCol(['trading fees', 'fee', 'commission']);
        const statusIdx = findCol(['status', 'state']);

        const errors: string[] = [];
        if (symbolIdx === -1) errors.push('Missing Symbol column.');
        if (priceIdx === -1) errors.push('Missing Price column.');
        if (dateIdx === -1) errors.push('Missing Date column.');

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
                }
                const dateVal = new Date(dateStr);
                const validDate = !isNaN(dateVal.getTime()) ? dateVal.toISOString() : new Date().toISOString();

                const symbol = getVal(symbolIdx) ? String(getVal(symbolIdx)).toUpperCase() : 'UNKNOWN';
                const price = parseFloat(String(getVal(priceIdx)).replace(/[^0-9.-]/g, ''));
                const qty = parseFloat(String(getVal(qtyIdx)).replace(/[^0-9.-]/g, ''));
                const pnl = parseFloat(pnlIdx !== -1 ? String(getVal(pnlIdx)).replace(/[^0-9.-]/g, '') : '0');
                const fee = parseFloat(feeIdx !== -1 ? String(getVal(feeIdx)).replace(/[^0-9.-]/g, '') : '0');

                let side = TradeSide.LONG;
                const sideVal = getVal(sideIdx);
                if (sideVal && (String(sideVal).toLowerCase().includes('sell') || String(sideVal).toLowerCase().includes('short'))) side = TradeSide.SHORT;

                const status = (pnl !== 0 || fee > 0 || (statusVal && String(statusVal).toLowerCase() === 'closed')) ? TradeStatus.CLOSED : TradeStatus.OPEN;

                const safeQty = isNaN(qty) ? 0 : Math.abs(qty);
                const safePnl = isNaN(pnl) ? 0 : pnl;

                // Estimate Exit Price if closed and pnl exists
                let exitPrice = price;
                if (status === TradeStatus.CLOSED && safeQty > 0) {
                    if (side === TradeSide.LONG) {
                        exitPrice = price + (safePnl / safeQty);
                    } else {
                        exitPrice = price - (safePnl / safeQty);
                    }
                }

                const pnlPercentage = (price > 0 && safeQty > 0) ? (safePnl / (price * safeQty)) * 100 : 0;

                if (!isNaN(price) && symbol !== 'UNKNOWN') {
                    parsedTrades.push({
                        id: `imp-${Date.now()}-${i}`,
                        symbol, side, entryPrice: price, exitPrice, quantity: safeQty,
                        pnl: safePnl, pnlPercentage, status,
                        entryDate: validDate, exitDate: status === TradeStatus.CLOSED ? validDate : undefined,
                        exchange: 'Imported', strategy: 'Imported', tradeType: 'PAST',
                        notes: `Imported via CSV. Fees: ${fee.toFixed(4)}`, riskReward: 0, capital: Math.abs(price * safeQty), leverage: 1
                    });
                }
            } catch (err) { }
        });

        return { trades: parsedTrades, errors: [] };
    };

    const handleExportData = () => {
        const csv = Papa.unparse(trades);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'vyuha_trades_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClearData = () => {
        if (confirm('DANGER: This will delete ALL your trades, settings, and journal entries. This action cannot be undone. Are you sure?')) {
            localStorage.clear();
            window.location.reload();
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
                    <p className="text-slate-400">Manage appearance, preferences, and data</p>
                </div>
            </div>

            <div className="space-y-6">
                <SectionCard title="Appearance & Preferences" icon="fa-sliders">
                    <div className="space-y-6">
                        {/* Theme Colors */}
                        <div className="border-b border-slate-800 pb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-white">Theme Colors</h4>
                                <button
                                    onClick={() => onUpdateProfile({
                                        ...userProfile,
                                        theme: { primary: '#4f46e5', secondary: '#10b981' }
                                    })}
                                    className="text-[10px] text-slate-500 hover:text-white underline"
                                >
                                    Reset to Default
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Primary Color</label>
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0B0E14] border border-slate-700">
                                        <input
                                            type="color"
                                            value={userProfile.theme?.primary || '#4f46e5'}
                                            onChange={(e) => onUpdateProfile({
                                                ...userProfile,
                                                theme: { ...userProfile.theme, primary: e.target.value, secondary: userProfile.theme?.secondary || '#10b981' }
                                            })}
                                            className="h-8 w-8 rounded cursor-pointer bg-transparent border-none p-0 appearance-none"
                                        />
                                        <span className="text-xs text-white font-mono uppercase">{userProfile.theme?.primary || '#4f46e5'}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Secondary Color</label>
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0B0E14] border border-slate-700">
                                        <input
                                            type="color"
                                            value={userProfile.theme?.secondary || '#10b981'}
                                            onChange={(e) => onUpdateProfile({
                                                ...userProfile,
                                                theme: { ...userProfile.theme, secondary: e.target.value, primary: userProfile.theme?.primary || '#4f46e5' }
                                            })}
                                            className="h-8 w-8 rounded cursor-pointer bg-transparent border-none p-0 appearance-none"
                                        />
                                        <span className="text-xs text-white font-mono uppercase">{userProfile.theme?.secondary || '#10b981'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="space-y-4">
                            <Toggle
                                label="Enable Live Animations"
                                help="Toggle visual animations for data updates."
                                checked={userProfile.preferences?.enableAnimations ?? true}
                                onChange={(v) => onUpdateProfile({
                                    ...userProfile,
                                    preferences: { ...userProfile.preferences, enableAnimations: v, includeImportPnl: userProfile.preferences?.includeImportPnl ?? false }
                                })}
                            />
                            <Toggle
                                label="Include Import PnL"
                                help="Count imported historical trades in Portfolio Balance."
                                checked={userProfile.preferences?.includeImportPnl ?? false}
                                onChange={(v) => onUpdateProfile({
                                    ...userProfile,
                                    preferences: { ...userProfile.preferences, includeImportPnl: v, enableAnimations: userProfile.preferences?.enableAnimations ?? true }
                                })}
                            />
                        </div>

                        {/* Font Selection */}
                        <div className="border-t border-slate-800 pt-6">
                            <h4 className="text-sm font-bold text-white mb-4">Trading Font (Aggressive)</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                {[
                                    { name: 'Morvanh', family: "'Morvanh', sans-serif" },
                                    { name: 'Supera', family: "'Supera', sans-serif" },
                                    { name: 'Standard', family: "'Inter', sans-serif" },
                                    { name: 'Aggressive', family: "'Anton', sans-serif" },
                                    { name: 'Graffiti', family: "'Permanent Marker', cursive" },
                                    { name: 'Action', family: "'Bangers', cursive" },
                                    { name: 'Industrial', family: "'Staatliches', cursive" },
                                    { name: 'Tech Elite', family: "'Russo One', sans-serif" },
                                    { name: 'Military', family: "'Black Ops One', cursive" },
                                    { name: 'High Tech', family: "'Orbitron', sans-serif" },
                                    { name: 'Modern', family: "'Righteous', cursive" },
                                    { name: 'Horror', family: "'Creepster', cursive" },
                                    { name: 'Impact', family: "'Luckiest Guy', cursive" }
                                ].map((f) => (
                                    <button
                                        key={f.name}
                                        onClick={() => onUpdateProfile({
                                            ...userProfile,
                                            preferences: { ...userProfile.preferences, fontFamily: f.family, enableAnimations: userProfile.preferences?.enableAnimations ?? true, includeImportPnl: userProfile.preferences?.includeImportPnl ?? false }
                                        })}
                                        className={`p-3 rounded-xl border transition-all text-center group ${(userProfile.preferences?.fontFamily || "'Inter', sans-serif") === f.family
                                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                                            : 'bg-[#0B0E14] border-slate-800 text-slate-500 hover:border-slate-600 hover:text-white'
                                            }`}
                                    >
                                        <div style={{ fontFamily: f.family }} className="text-lg mb-1 group-hover:scale-110 transition-transform">ABC</div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider">{f.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard title="Import / Export" icon="fa-file-csv">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-[#0B0E14] border border-slate-800 flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-white text-sm">Import CSV</h4>
                                <p className="text-xs text-slate-500 mt-1">Upload trades from external sources.</p>
                            </div>
                            <div>
                                <input type="file" accept=".csv,.txt" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors">Select File</button>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-[#0B0E14] border border-slate-800 flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-white text-sm">Export Data</h4>
                                <p className="text-xs text-slate-500 mt-1">Download all trades as CSV.</p>
                            </div>
                            <button onClick={handleExportData} className="px-3 py-1.5 rounded border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-colors">Download</button>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col md:flex-row gap-4">
                        <div className="flex-1 p-4 rounded-xl bg-[#0B0E14] border border-rose-900/20 flex items-center justify-between group">
                            <div>
                                <h4 className="font-bold text-rose-400 group-hover:text-rose-300 text-sm transition-colors">Clear Imported Trades</h4>
                                <p className="text-xs text-slate-500 mt-1">Remove only trades from CSV imports.</p>
                            </div>
                            <button onClick={onClearImportedTrades} className="px-3 py-1.5 rounded bg-rose-900/20 border border-rose-900/50 hover:bg-rose-600 hover:text-white text-rose-500 text-xs font-bold transition-all">Clear Imported</button>
                        </div>

                        <div className="flex-1 p-4 rounded-xl bg-[#0B0E14] border border-rose-900/20 flex items-center justify-between group">
                            <div>
                                <h4 className="font-bold text-rose-400 group-hover:text-rose-300 text-sm transition-colors">Clear All Logged Trades</h4>
                                <p className="text-xs text-slate-500 mt-1">Remove all trade history (keeps settings).</p>
                            </div>
                            <button onClick={onClearTrades} className="px-3 py-1.5 rounded bg-rose-900/20 border border-rose-900/50 hover:bg-rose-600 hover:text-white text-rose-500 text-xs font-bold transition-all">Clear All</button>
                        </div>
                    </div>
                </SectionCard>

                <DataMigration />

                <div className="rounded-2xl border border-rose-900/30 bg-[#151A25] p-6">
                    <h3 className="text-lg font-bold text-rose-400 mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation"></i> Danger Zone
                    </h3>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-[#0B0E14] border border-rose-900/30">
                        <div>
                            <h4 className="text-sm font-bold text-white">Factory Reset</h4>
                            <p className="text-xs text-slate-400 mt-1">Permanently delete all data and reset to default state.</p>
                        </div>
                        <button
                            onClick={handleClearData}
                            className="px-4 py-2 rounded-lg bg-rose-600/10 border border-rose-600/50 text-rose-500 text-xs font-bold hover:bg-rose-600 hover:text-white transition-all"
                        >
                            Reset Application
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Sub-components ---

const SectionCard = ({ title, icon, children }: { title: string, icon: string, children: React.ReactNode }) => (
    <div className="rounded-2xl border border-slate-800 bg-[#151A25] p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <i className={`fa-solid ${icon} text-indigo-400`}></i> {title}
        </h3>
        {children}
    </div>
);

const Toggle = ({ label, checked, onChange, help }: { label: string, checked: boolean, onChange: (v: boolean) => void, help?: string }) => (
    <div className="flex items-center justify-between p-4 rounded-xl bg-[#0B0E14] border border-slate-800">
        <div>
            <h4 className="font-bold text-white text-sm">{label}</h4>
            {help && <p className="text-xs text-slate-500 mt-1">{help}</p>}
        </div>
        <button
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);



export default Settings;
