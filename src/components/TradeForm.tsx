
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trade, TradeSide, TradeStatus, Strategy, FeeConfig, Tag, TAG_COLORS, TradeType, RiskState } from '../types';
import { TRADING_ASSETS } from '../constants/assets';

interface TradeFormProps {
    // Backward compatible props
    isOpen?: boolean;
    onClose: () => void;
    onSubmit?: (trade: Trade) => void; // Legacy prop
    // New props
    onSave?: (trade: Trade) => void;
    strategies: Strategy[];
    onUpdateStrategy?: (strategy: Strategy) => void;
    availableTags?: Record<string, Tag[]>;
    onAddGlobalTag?: (category: string, tagName: string) => void;
    availableExchanges?: string[];
    onAddExchange?: (name: string) => void;
    defaultExchange?: string;
    userTimezone?: string;
    portfolioBalance?: number;
    userFees?: FeeConfig;
    exchangeFees?: Record<string, FeeConfig>;
    onEditFees?: () => void;
    riskState?: RiskState;
    baseCurrency?: string; // Legacy prop
    initialSymbol?: string; // Optional prop to pre-fill symbol
    trades?: Trade[]; // For Data mode analysis
    slPresets?: number[];
    tpPresets?: number[];
    leveragePresets?: number[];
    riskPresets?: number[];
    favoriteSymbols?: string[];
    onToggleFavoriteSymbol?: (symbol: string) => void;
    onJumpToPortfolio?: () => void;
}



interface InputGroupProps {
    label: string;
    children: React.ReactNode;
    customIcon?: React.ReactNode;
    focusClass?: string;
    className?: string;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, children, customIcon, focusClass, className = '' }) => (
    <div className={`space-y-2 ${className}`}>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
        <div className={`flex items-center rounded-lg border border-slate-800 bg-[#151A25] px-4 py-2.5 transition-colors ${focusClass || 'focus-within:border-indigo-500'}`}>
            {customIcon && <div className="mr-3 flex items-center justify-center w-5">{customIcon}</div>}
            {children}
        </div>
    </div>
);

const TradeForm: React.FC<TradeFormProps> = ({
    onClose,
    onSave,
    onSubmit, // Legacy prop
    strategies,
    onUpdateStrategy,
    availableTags = {},
    onAddGlobalTag,
    availableExchanges = ['Binance'],
    onAddExchange,
    defaultExchange = 'Binance',
    userTimezone = 'UTC',
    portfolioBalance = 0,
    userFees = { maker: 0.02, taker: 0.05, type: 'PERCENTAGE' },
    exchangeFees,
    onEditFees,
    riskState,
    initialSymbol = '',
    trades = [],
    slPresets = [1, 2, 3, 4, 5, 6],
    tpPresets = [1, 2, 3, 4, 5, 6],
    leveragePresets = [1, 5, 10, 25, 50, 100, 500, 1000, 2000],
    riskPresets = [0.5, 1, 2, 3, 5],
    favoriteSymbols = [],
    onToggleFavoriteSymbol,
    onJumpToPortfolio
}) => {
    // Use onSave if provided, otherwise fall back to onSubmit for backward compatibility
    const handleSave = onSave || onSubmit || (() => { });

    // Default riskState if not provided (for backward compatibility)
    const defaultRiskState: RiskState = {
        isLocked: false,
        maxTrades: 0,
        tradeCount: 0,
        dailyDDLimit: 0,
        currentDD: 0
    };
    const effectiveRiskState = riskState || defaultRiskState;

    // Helper to get current time in user's timezone
    const getCurrentTimeInZone = () => {
        try {
            const now = new Date();
            const timeString = now.toLocaleString('en-CA', {
                timeZone: userTimezone,
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            });
            const [date, time] = timeString.split(', ');
            return `${date}T${time.slice(0, 5)}`;
        } catch (e) {
            return new Date().toISOString().slice(0, 16);
        }
    };

    const [entryMode, setEntryMode] = useState<TradeType>('LIVE');

    useEffect(() => {
        if (effectiveRiskState.isLocked && entryMode === 'LIVE') {
            // Trigger any visual alerts if needed
        }
    }, [effectiveRiskState.isLocked, entryMode]);

    const [formData, setFormData] = useState({
        symbol: initialSymbol,
        side: TradeSide.LONG,
        entryDate: getCurrentTimeInZone(),
        exchange: defaultExchange,
        strategy: '',
        strategyId: '',
        entryPrice: '',
        capital: '',
        leverage: 1,
        stopLoss: '',
        takeProfit: '',
        exitPrice: '',
        exitDate: getCurrentTimeInZone(),
        exitQuality: 0,
        notes: ''
    });

    const [slPercent, setSlPercent] = useState('');
    const [tpPercent, setTpPercent] = useState('');
    const [riskPercent, setRiskPercent] = useState('1'); // Default 1% risk
    const [isCalculatingByRisk, setIsCalculatingByRisk] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeAsset, setActiveAsset] = useState<typeof TRADING_ASSETS[0] | null>(null);
    const [isFetchingEntry, setIsFetchingEntry] = useState(false);
    const [isFetchingExit, setIsFetchingExit] = useState(false);
    const [binanceSymbols, setBinanceSymbols] = useState<any[]>([]);
    const [showAddExchange, setShowAddExchange] = useState(false);
    const [newExchangeName, setNewExchangeName] = useState('');

    // Tag Inputs
    const [entryReasonInput, setEntryReasonInput] = useState('');
    const [entryReasons, setEntryReasons] = useState<string[]>([]);
    const [exitReasonInput, setExitReasonInput] = useState('');
    const [exitReasons, setExitReasons] = useState<string[]>([]);
    const [mentalStateInput, setMentalStateInput] = useState('');
    const [mentalStates, setMentalStates] = useState<string[]>([]);
    const [generalTagInput, setGeneralTagInput] = useState('');
    const [generalTags, setGeneralTags] = useState<string[]>([]);

    // Strategy Validation State
    const [selectedSetups, setSelectedSetups] = useState<string[]>([]);
    const [checkedRules, setCheckedRules] = useState<string[]>([]);

    const [metrics, setMetrics] = useState({
        positionSize: 0,
        estFees: 0,
        liquidationPrice: 0,
        quantity: 0,
        pips: 0,
        lots: 0,
        pipValue: 0
    });

    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Dynamic Theme based on Side
    const theme = {
        border: formData.side === TradeSide.LONG ? 'border-emerald-500/30' : 'border-rose-500/30',
        shadow: formData.side === TradeSide.LONG ? 'shadow-emerald-500/10' : 'shadow-rose-500/10',
        focusBorder: formData.side === TradeSide.LONG ? 'focus-within:border-emerald-500' : 'focus-within:border-rose-500',
        focusRing: formData.side === TradeSide.LONG ? 'focus:ring-emerald-500/20' : 'focus:ring-rose-500/20',
        button: formData.side === TradeSide.LONG ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500',
        textAccent: formData.side === TradeSide.LONG ? 'text-emerald-400' : 'text-rose-400',
        iconBg: formData.side === TradeSide.LONG ? 'bg-emerald-600' : 'bg-rose-600',
        bgSoft: formData.side === TradeSide.LONG ? 'bg-emerald-500/5' : 'bg-rose-500/5',
    };

    useEffect(() => {
        let capital = parseFloat(formData.capital) || 0;
        const entry = parseFloat(formData.entryPrice) || 0;
        const sl = parseFloat(formData.stopLoss) || 0;
        const lev = formData.leverage || 1;
        const risk = parseFloat(riskPercent) || 0;

        let qty = 0;
        let positionSize = 0;

        if (isCalculatingByRisk && entry > 0 && risk > 0 && portfolioBalance > 0) {
            // In this mode, Risk % acts as Margin Allocation
            const marginAllocation = (portfolioBalance * risk) / 100;
            positionSize = marginAllocation * lev;
            qty = entry > 0 ? positionSize / entry : 0;

            // Sync the capital (margin) field to the allocated margin
            if (Math.abs(marginAllocation - (parseFloat(formData.capital) || 0)) > 0.01) {
                setFormData(prev => ({ ...prev, capital: marginAllocation.toFixed(2) }));
            }
        } else {
            positionSize = capital * lev;
            qty = entry > 0 ? positionSize / entry : 0;
        }

        const activeFeeConfig = (formData.exchange && exchangeFees?.[formData.exchange]) || userFees;

        let fees = 0;
        if (activeFeeConfig.type === 'FIXED') {
            fees = (activeFeeConfig.taker || 0) * 2;
        } else {
            const rate = (activeFeeConfig.taker || 0.05) / 100;
            const effectivePosSize = isCalculatingByRisk ? positionSize : (parseFloat(formData.capital) || 0) * lev;
            fees = (effectivePosSize * rate) * 2;
        }

        let liq = 0;
        if (entry > 0) {
            if (formData.side === TradeSide.LONG) {
                liq = entry * (1 - (1 / lev) + 0.005);
            } else {
                liq = entry * (1 + (1 / lev) - 0.005);
            }
        }

        // Pip and Lot Calculation
        let pips = 0;
        let lots = 0;
        let pipValue = 0;

        if (entry > 0) {
            const isYenPair = formData.symbol.includes('JPY');
            const pipSize = isYenPair ? 0.01 : 0.0001;

            if (sl > 0) {
                pips = Math.abs(entry - sl) / pipSize;
            }

            // Standard Lot = 100k units
            lots = qty / 100000;

            // Pip Value = Quantity * Pip Size
            pipValue = qty * pipSize;
        }

        setMetrics({
            positionSize: positionSize,
            estFees: fees,
            liquidationPrice: Math.max(0, liq),
            quantity: qty,
            pips: pips,
            lots: lots,
            pipValue: pipValue
        });
    }, [formData.capital, formData.entryPrice, formData.stopLoss, formData.leverage, formData.side, userFees, exchangeFees, formData.exchange, riskPercent, isCalculatingByRisk, portfolioBalance, activeAsset]);

    useEffect(() => {
        const fetchBinanceSymbols = async () => {
            try {
                const res = await fetch('https://api.binance.com/api/v3/exchangeInfo');
                if (res.ok) {
                    const data = await res.json();
                    const symbols = data.symbols
                        .filter((s: any) => s.status === 'TRADING' && (s.quoteAsset === 'USDT' || s.quoteAsset === 'USDC'))
                        .map((s: any) => ({
                            symbol: s.baseAsset,
                            name: `${s.baseAsset} on Binance`,
                            icon: 'fa-solid fa-cloud-arrow-down',
                            color: 'text-slate-400',
                            category: s.quoteAsset,
                            fullSymbol: s.symbol // Store full symbol like BTCUSDT
                        }));
                    setBinanceSymbols(symbols);
                }
            } catch (error) {
                console.error("Failed to fetch Binance symbols", error);
            }
        };
        fetchBinanceSymbols();

        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const found = TRADING_ASSETS.find(c => c.symbol === formData.symbol.toUpperCase());
        setActiveAsset(found || null);
    }, [formData.symbol]);

    useEffect(() => {
        setSelectedSetups([]);
        setCheckedRules([]);
    }, [formData.strategy]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (entryMode === 'LIVE' && effectiveRiskState.isLocked) {
            alert(`Trading Locked: ${effectiveRiskState.lockReason || 'Risk limits exceeded'}`);
            return;
        }

        let pnl = 0;
        let pnlPercentage = 0;
        let status = TradeStatus.OPEN;
        let finalExitDate = undefined;
        let finalExitPrice = undefined;

        if (entryMode !== 'LIVE') {
            status = TradeStatus.CLOSED;
            finalExitDate = formData.exitDate;
            finalExitPrice = parseFloat(formData.exitPrice);

            if (formData.side === TradeSide.LONG) {
                pnl = (finalExitPrice - parseFloat(formData.entryPrice)) * metrics.quantity;
            } else {
                pnl = (parseFloat(formData.entryPrice) - finalExitPrice) * metrics.quantity;
            }

            const cap = parseFloat(formData.capital);
            if (cap > 0) pnlPercentage = (pnl / cap) * 100;
        }

        const newTrade: Trade = {
            id: Math.random().toString(36).substr(2, 9),
            symbol: formData.symbol.toUpperCase(),
            side: formData.side,
            entryPrice: parseFloat(formData.entryPrice),
            quantity: metrics.quantity,
            capital: parseFloat(formData.capital),
            leverage: formData.leverage,
            exchange: formData.exchange,
            entryDate: formData.entryDate,
            status: status,
            tradeType: entryMode,
            exitDate: finalExitDate,
            exitPrice: finalExitPrice,
            exitQuality: entryMode !== 'LIVE' ? (formData.exitQuality || undefined) : undefined,
            pnl: status === TradeStatus.CLOSED ? pnl : undefined,
            pnlPercentage: status === TradeStatus.CLOSED ? parseFloat(pnlPercentage.toFixed(2)) : undefined,
            notes: formData.notes,
            strategy: formData.strategy || 'Discretionary',
            strategyId: formData.strategyId,
            stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : undefined,
            takeProfit: formData.takeProfit ? parseFloat(formData.takeProfit) : undefined,
            entryReasons: entryReasons,
            exitReasons: exitReasons,
            mentalState: mentalStates,
            tags: generalTags,
            setups: selectedSetups,
            entryChecklist: checkedRules,
            riskReward: calculateRR(),
            fees: metrics.estFees,
            source: 'MANUAL',
        };

        handleSave(newTrade);
        onClose();
    };

    const calculateRR = () => {
        const entry = parseFloat(formData.entryPrice);
        const sl = parseFloat(formData.stopLoss);
        const tp = parseFloat(formData.takeProfit);
        if (!entry || !sl || !tp) return 0;

        const risk = Math.abs(entry - sl);
        const reward = Math.abs(tp - entry);
        return parseFloat((reward / risk).toFixed(2));
    };

    const setCapitalByPercent = (percent: number) => {
        const amount = (portfolioBalance * percent) / 100;
        setFormData(prev => ({ ...prev, capital: amount.toFixed(0) }));
    };

    const handleEntryPriceChange = (val: string) => {
        setFormData(prev => ({ ...prev, entryPrice: val }));
        // Recalculate SL/TP percentages if prices are set
        const entry = parseFloat(val);
        if (!isNaN(entry) && entry > 0) {
            if (formData.stopLoss) {
                const sl = parseFloat(formData.stopLoss);
                if (!isNaN(sl)) setSlPercent((Math.abs((sl - entry) / entry) * 100).toFixed(2));
            }
            if (formData.takeProfit) {
                const tp = parseFloat(formData.takeProfit);
                if (!isNaN(tp)) setTpPercent((Math.abs((tp - entry) / entry) * 100).toFixed(2));
            }
        }
    };

    const setPriceByPercent = (type: 'SL' | 'TP', percent: number) => {
        const entry = parseFloat(formData.entryPrice);
        if (isNaN(entry) || entry <= 0) return;

        let price = 0;
        if (type === 'SL') {
            setSlPercent(percent.toString());
            if (formData.side === TradeSide.LONG) {
                price = entry * (1 - percent / 100);
            } else {
                price = entry * (1 + percent / 100);
            }
            setFormData(prev => ({ ...prev, stopLoss: price.toFixed(2) }));
        } else {
            setTpPercent(percent.toString());
            if (formData.side === TradeSide.LONG) {
                price = entry * (1 + percent / 100);
            } else {
                price = entry * (1 - percent / 100);
            }
            setFormData(prev => ({ ...prev, takeProfit: price.toFixed(2) }));
        }
    };

    const handleSlPriceChange = (val: string) => {
        setFormData(prev => ({ ...prev, stopLoss: val }));
        const sl = parseFloat(val);
        const entry = parseFloat(formData.entryPrice);
        if (!isNaN(sl) && !isNaN(entry) && entry > 0) {
            setSlPercent((Math.abs((sl - entry) / entry) * 100).toFixed(2));
        } else if (val === '') {
            setSlPercent('');
        }
    };

    const handleTpPriceChange = (val: string) => {
        setFormData(prev => ({ ...prev, takeProfit: val }));
        const tp = parseFloat(val);
        const entry = parseFloat(formData.entryPrice);
        if (!isNaN(tp) && !isNaN(entry) && entry > 0) {
            setTpPercent((Math.abs((tp - entry) / entry) * 100).toFixed(2));
        } else if (val === '') {
            setTpPercent('');
        }
    };

    // --- Fetch Price Logic ---
    const fetchLivePrice = async (symbol: string, field: 'entry' | 'exit') => {
        if (!symbol) return;
        if (field === 'entry') setIsFetchingEntry(true); else setIsFetchingExit(true);
        try {
            const normalizedSymbol = symbol.toUpperCase().replace('/', '').replace('-', '');

            // 1. Try Binance for Crypto
            if (!normalizedSymbol.includes('USD') || normalizedSymbol.endsWith('USDT') || normalizedSymbol.endsWith('USDC')) {
                try {
                    const isPair = normalizedSymbol.endsWith('USDT') || normalizedSymbol.endsWith('USDC') || normalizedSymbol.endsWith('BUSD') || (normalizedSymbol.length > 4 && (normalizedSymbol.endsWith('BTC') || normalizedSymbol.endsWith('ETH')));
                    const binanceSymbol = isPair ? normalizedSymbol : `${normalizedSymbol}USDT`;
                    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.price) {
                            const price = parseFloat(data.price).toString();
                            if (field === 'entry') handleEntryPriceChange(price);
                            else setFormData(prev => ({ ...prev, exitPrice: price }));
                            return;
                        }
                    }
                } catch (e) { }
            }

            // 2. Try CryptoCompare for Forex, Commodities, and Crypto Fallback
            let fsym = normalizedSymbol;
            let tsym = 'USD';

            // Common commodity/asset mappings for CryptoCompare
            const COMMODITY_MAP: Record<string, string> = {
                'GOLD': 'XAU', 'SILVER': 'XAG', 'OIL': 'WTI', 'USOIL': 'WTI', 'UKOIL': 'UKOIL', 'NG': 'NG'
            };

            if (COMMODITY_MAP[normalizedSymbol]) {
                fsym = COMMODITY_MAP[normalizedSymbol];
            } else if (normalizedSymbol.length === 6) {
                // Split common pairs like EURUSD, GBPAUD
                fsym = normalizedSymbol.substring(0, 3);
                tsym = normalizedSymbol.substring(3);
            } else if (normalizedSymbol.length === 7 && normalizedSymbol.endsWith('USDT')) {
                fsym = normalizedSymbol.substring(0, 4);
                tsym = 'USDT';
            } else if (normalizedSymbol.endsWith('USDT')) {
                fsym = normalizedSymbol.replace('USDT', '');
                tsym = 'USDT';
            } else if (normalizedSymbol.endsWith('USD')) {
                fsym = normalizedSymbol.replace('USD', '');
                tsym = 'USD';
            }

            const ccResponse = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${fsym}&tsyms=${tsym},USDT,USD`);
            if (ccResponse.ok) {
                const ccData = await ccResponse.json();

                if (ccData.Response === 'Error') {
                    // Try raw symbol if split failed
                    const rawResponse = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${normalizedSymbol}&tsyms=USD,USDT`);
                    if (rawResponse.ok) {
                        const rawData = await rawResponse.json();
                        const price = rawData.USD || rawData.USDT;
                        if (price) {
                            if (field === 'entry') handleEntryPriceChange(price.toString());
                            else setFormData(prev => ({ ...prev, exitPrice: price.toString() }));
                            return;
                        }
                    }
                } else {
                    const priceVal = ccData[tsym] || ccData.USDT || ccData.USD;

                    // If it's a forex pair and we didn't get a value, try inverted
                    if (!priceVal && (normalizedSymbol.length === 6 || normalizedSymbol.length === 7)) {
                        const invResponse = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${tsym}&tsyms=${fsym}`);
                        if (invResponse.ok) {
                            const invData = await invResponse.ok ? await invResponse.json() : null;
                            if (invData && invData[fsym]) {
                                const price = (1 / invData[fsym]).toString();
                                if (field === 'entry') handleEntryPriceChange(price);
                                else setFormData(prev => ({ ...prev, exitPrice: price }));
                                return;
                            }
                        }
                    }

                    if (priceVal) {
                        const price = priceVal.toString();
                        if (field === 'entry') handleEntryPriceChange(price);
                        else setFormData(prev => ({ ...prev, exitPrice: price }));
                        return; // Found a price
                    }
                }
            }
        } catch (error) { console.error("Failed to fetch price", error); }
        finally { if (field === 'entry') setIsFetchingEntry(false); else setIsFetchingExit(false); }
    };

    const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase();
        setFormData({ ...formData, symbol: val });
        setShowSuggestions(true);
    };

    const handleSymbolBlur = () => {
        setTimeout(() => {
            if (formData.symbol && entryMode === 'LIVE') fetchLivePrice(formData.symbol, 'entry');
        }, 200);
    };

    const selectSymbol = (asset: any) => {
        setFormData({ ...formData, symbol: asset.symbol });
        setShowSuggestions(false);
        if (entryMode === 'LIVE') fetchLivePrice(asset.symbol, 'entry');
    };

    const filteredAssets = useMemo(() => {
        const query = formData.symbol.toUpperCase();

        let assets = [...TRADING_ASSETS];

        // Add dynamic binance symbols that aren't in TRADING_ASSETS
        binanceSymbols.forEach(s => {
            if (!assets.some(a => a.symbol === s.symbol)) {
                assets.push(s);
            }
        });

        // Search filtering
        if (query) {
            assets = assets.filter(
                asset => asset.symbol.includes(query) || asset.name.toUpperCase().includes(query)
            );
        } else {
            assets = assets.slice(0, 20);
        }

        // Sort by Favorites first, then Alphabetical
        return assets.sort((a, b) => {
            const aFav = favoriteSymbols.includes(a.symbol);
            const bFav = favoriteSymbols.includes(b.symbol);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            return a.symbol.localeCompare(b.symbol);
        });
    }, [formData.symbol, binanceSymbols, favoriteSymbols]);

    const getSymbolIcon = (symbol: string) => {
        const found = TRADING_ASSETS.find(a => a.symbol === symbol) || binanceSymbols.find(a => a.symbol === symbol);
        if (found && found.icon && !found.icon.includes('fa-cloud-arrow-down')) return found.icon;

        // Dynamic Mapping
        const s = symbol.toUpperCase();
        if (s.includes('BTC')) return 'fa-brands fa-bitcoin';
        if (s.includes('ETH')) return 'fa-brands fa-ethereum';
        if (s.includes('SOL')) return 'fa-solid fa-layer-group text-emerald-400';
        if (s.includes('XRP')) return 'fa-solid fa-droplet text-blue-400';
        if (s.includes('BNB')) return 'fa-solid fa-coins text-yellow-400';
        if (s.includes('EUR') || s.includes('GBP') || s.includes('JPY') || s.includes('USD')) return 'fa-solid fa-money-bill-transfer';
        if (s.includes('GOLD') || s.includes('XAU')) return 'fa-solid fa-ring text-amber-400';
        if (s.includes('OIL')) return 'fa-solid fa-droplet text-slate-800';

        return 'fa-solid fa-coins text-slate-500';
    };

    // --- Tag Management ---
    const addTag = (val: string, setVal: (s: string) => void, list: string[], setList: (l: string[]) => void, category: string) => {
        if (val && val.trim()) {
            const trimmedVal = val.trim();
            if (!list.includes(trimmedVal)) {
                setList([...list, trimmedVal]);
                if (onAddGlobalTag) onAddGlobalTag(category, trimmedVal);
            }
            setVal('');
        }
    };

    const removeTag = (tagToRemove: string, list: string[], setList: (l: string[]) => void) => {
        setList(list.filter(t => t !== tagToRemove));
    };

    const handleAddCustomExchange = () => {
        if (newExchangeName && newExchangeName.trim() && onAddExchange) {
            onAddExchange(newExchangeName.trim());
            setFormData({ ...formData, exchange: newExchangeName.trim() });
            setNewExchangeName('');
            setShowAddExchange(false);
        }
    };

    const getTagStyles = (tagName: string) => {
        let tagDef: Tag | undefined;
        if (availableTags) {
            Object.values(availableTags).forEach(categoryTags => {
                if (!tagDef) tagDef = categoryTags.find(t => t.name === tagName);
            });
        }

        const color = tagDef?.color || 'slate';
        const styles = TAG_COLORS[color] || TAG_COLORS.slate;
        const isBold = tagDef?.isBold;
        const hasGlow = tagDef?.hasGlow;

        return `px-2 py-1 rounded text-[10px] border flex items-center gap-1 transition-all ${styles.bg} ${styles.border} ${styles.text} ${isBold ? 'font-bold' : 'font-medium'} ${hasGlow ? styles.glow : ''}`;
    };

    const activeStrategies = strategies.filter(s => s.status === 'active');
    const selectedStrategyObj = activeStrategies.find(s => s.id === formData.strategyId);
    const allMandatoryChecked = !selectedStrategyObj || entryMode === 'PAST' || (selectedStrategyObj.entryRules?.primary || []).every(r => checkedRules.includes(r));
    const isExitValid = entryMode === 'LIVE' || (formData.exitPrice && formData.exitDate);
    const shouldBlockEntry = entryMode === 'LIVE' && effectiveRiskState.isLocked;

    // Visualization helpers for Risk Ticket
    const tradesRemaining = effectiveRiskState.maxTrades > 0 ? effectiveRiskState.maxTrades - effectiveRiskState.tradeCount : 999;
    const tradesProgress = effectiveRiskState.maxTrades > 0 ? (effectiveRiskState.tradeCount / effectiveRiskState.maxTrades) * 100 : 0;
    const drawdownProgress = effectiveRiskState.dailyDDLimit > 0 ? (effectiveRiskState.currentDD / effectiveRiskState.dailyDDLimit) * 100 : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-5xl overflow-hidden rounded-2xl border bg-[#0B0E14] shadow-2xl flex flex-col max-h-[95vh] relative ${theme.border} ${theme.shadow}`}>

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 bg-[#151A25] px-6 py-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded text-white ${theme.iconBg}`}>
                            <i className="fa-solid fa-pen-nib"></i>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-none">Log your position with discipline</h2>
                            <p className="text-xs text-slate-400 mt-1">Every trade is a lesson. Record it accurately.</p>
                        </div>
                    </div>

                    <div className="bg-[#0B0E14] rounded-lg p-1 flex border border-slate-800">
                        <button onClick={() => setEntryMode('LIVE')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${entryMode === 'LIVE' ? 'bg-[#1E2330] text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>Live Entry</button>
                        <button onClick={() => setEntryMode('PAST')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${entryMode === 'PAST' ? 'bg-[#1E2330] text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>Log Past</button>
                        <button onClick={() => setEntryMode('DATA')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${entryMode === 'DATA' ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 shadow' : 'text-slate-500 hover:text-slate-300'}`}>Data Study</button>
                    </div>

                    <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white transition-colors">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                {/* Hazard Banner for Risk Lock */}
                {shouldBlockEntry && (
                    <div className="px-6 py-3 border-b border-rose-500/50 flex items-center justify-center gap-3 animate-in slide-in-from-top-2 bg-rose-500/10">
                        <i className="fa-solid fa-triangle-exclamation text-rose-500 text-lg animate-pulse"></i>
                        <span className="text-sm font-bold text-white uppercase tracking-wider">Trading Locked: {effectiveRiskState.lockReason || 'Risk limits exceeded'}</span>
                    </div>
                )}

                {/* Risk Tickets (Only in LIVE mode) */}
                {!shouldBlockEntry && entryMode === 'LIVE' && (
                    <div className="px-6 py-3 bg-[#0F1218] border-b border-slate-800 flex gap-4">
                        {effectiveRiskState.maxTrades > 0 && (
                            <div className="flex-1 rounded-lg border border-slate-800 bg-[#151A25] p-2 flex items-center gap-3">
                                <div className={`h-8 w-8 rounded flex items-center justify-center border ${tradesRemaining === 0 ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'}`}>
                                    <i className="fa-solid fa-ticket"></i>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">
                                        <span>Daily Trades</span>
                                        <span className={tradesRemaining === 0 ? 'text-rose-500' : 'text-white'}>{tradesRemaining} Left</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-[#0B0E14] rounded-full overflow-hidden">
                                        <div style={{ width: `${Math.min(tradesProgress, 100)}%` }} className={`h-full rounded-full ${tradesRemaining === 0 ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {effectiveRiskState.dailyDDLimit > 0 && (
                            <div className="flex-1 rounded-lg border border-slate-800 bg-[#151A25] p-2 flex items-center gap-3">
                                <div className={`h-8 w-8 rounded flex items-center justify-center border ${drawdownProgress >= 100 ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                                    <i className="fa-solid fa-chart-line-down"></i>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">
                                        <span>Daily Drawdown</span>
                                        <span className={drawdownProgress >= 100 ? 'text-rose-500' : 'text-white'}>{effectiveRiskState.currentDD.toFixed(2)}% / {effectiveRiskState.dailyDDLimit}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-[#0B0E14] rounded-full overflow-hidden">
                                        <div style={{ width: `${Math.min(drawdownProgress, 100)}%` }} className={`h-full rounded-full ${drawdownProgress >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Scrollable Form Content */}
                <div className="overflow-y-auto p-6 custom-scrollbar flex-1 relative">
                    {shouldBlockEntry && (
                        <div className="absolute inset-0 bg-[#0B0E14]/50 z-10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none"></div>
                    )}

                    <form id="trade-form" onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                            {/* Symbol Input with Suggestions */}
                            <div className="relative" ref={suggestionsRef}>
                                <InputGroup label="Symbol" customIcon={activeAsset ? <i className={`${getSymbolIcon(activeAsset.symbol)} ${activeAsset.color}`}></i> : <i className="fa-solid fa-coins text-slate-500"></i>} focusClass={theme.focusBorder}>
                                    <input required type="text" placeholder="e.g. BTC" className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none uppercase" value={formData.symbol} onChange={handleSymbolChange} onFocus={() => setShowSuggestions(true)} onBlur={handleSymbolBlur} />
                                </InputGroup>
                                {showSuggestions && filteredAssets.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-700 bg-[#151A25] shadow-xl custom-scrollbar">
                                        {filteredAssets.map((asset) => {
                                            const isFav = favoriteSymbols.includes(asset.symbol);
                                            return (
                                                <div key={asset.symbol} className="flex group cursor-pointer items-center justify-between px-4 py-3 hover:bg-slate-800 transition-colors">
                                                    <div className="flex items-center gap-3 flex-1" onClick={() => selectSymbol(asset)}>
                                                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B0E14] border border-slate-800 ${asset.color}`}><i className={getSymbolIcon(asset.symbol)}></i></div>
                                                        <div><p className="text-sm font-bold text-white">{asset.symbol}</p><p className="text-xs text-slate-500">{asset.name}</p></div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); onToggleFavoriteSymbol?.(asset.symbol); }}
                                                        className={`p-2 transition-all ${isFav ? 'text-amber-400 opacity-100 scale-110' : 'text-slate-600 opacity-0 group-hover:opacity-100 hover:text-amber-400'}`}
                                                    >
                                                        <i className={`fa-star ${isFav ? 'fa-solid' : 'fa-regular'}`}></i>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Position Side */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Position</label>
                                <div className="flex bg-[#151A25] rounded-lg p-1 border border-slate-800">
                                    <button type="button" onClick={() => setFormData({ ...formData, side: TradeSide.LONG })} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${formData.side === TradeSide.LONG ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Long</button>
                                    <button type="button" onClick={() => setFormData({ ...formData, side: TradeSide.SHORT })} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${formData.side === TradeSide.SHORT ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Short</button>
                                </div>
                            </div>

                            {/* Date */}
                            <InputGroup label={`Entry Date & Time (${userTimezone})`} customIcon={<i className="fa-regular fa-calendar text-slate-500"></i>} focusClass={theme.focusBorder}>
                                <input type="datetime-local" className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none [color-scheme:dark]" value={formData.entryDate} onChange={e => setFormData({ ...formData, entryDate: e.target.value })} />
                            </InputGroup>

                            {/* Exchange */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Exchange</label>
                                <div className="relative">
                                    {showAddExchange ? (
                                        <div className="flex gap-2">
                                            <input
                                                autoFocus
                                                type="text"
                                                className={`w-full rounded-lg border border-slate-700 bg-[#0B0E14] px-4 py-2 text-xs text-white placeholder-slate-600 outline-none ${theme.focusBorder}`}
                                                placeholder="Enter exchange name..."
                                                value={newExchangeName}
                                                onChange={e => setNewExchangeName(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleAddCustomExchange();
                                                    if (e.key === 'Escape') setShowAddExchange(false);
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddCustomExchange}
                                                className="px-3 rounded-lg bg-indigo-600 text-white text-[10px] font-bold"
                                            >
                                                Add
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowAddExchange(false)}
                                                className="px-2 rounded-lg bg-slate-800 text-slate-400 text-[10px]"
                                            >
                                                <i className="fa-solid fa-xmark"></i>
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <select
                                                className={`w-full appearance-none rounded-lg border border-slate-800 bg-[#151A25] px-4 py-2.5 text-sm text-white ${theme.focusBorder} outline-none transition-all`}
                                                value={formData.exchange}
                                                onChange={e => {
                                                    if (e.target.value === 'ADD_NEW') {
                                                        setShowAddExchange(true);
                                                    } else {
                                                        setFormData({ ...formData, exchange: e.target.value });
                                                    }
                                                }}
                                            >
                                                <optgroup label="Presets">
                                                    {['Binance', 'Bybit', 'OKX', 'Bitget', 'KuCoin', 'IC Markets', 'Pepperstone', 'Exness', 'OANDA', 'IG'].map(ex => (
                                                        <option key={ex} value={ex}>{ex}</option>
                                                    ))}
                                                </optgroup>
                                                {availableExchanges.length > 0 && (
                                                    <optgroup label="Your Exchanges">
                                                        {availableExchanges.filter(e => !['Binance', 'Bybit', 'OKX', 'Bitget', 'KuCoin', 'IC Markets', 'Pepperstone', 'Exness', 'OANDA', 'IG'].includes(e)).map(ex => (
                                                            <option key={ex} value={ex}>{ex}</option>
                                                        ))}
                                                    </optgroup>
                                                )}
                                                <option value="ADD_NEW" className="text-indigo-400 font-bold">+ Add Custom Exchange...</option>
                                            </select>
                                            <i className="fa-solid fa-chevron-down absolute right-4 top-3.5 text-xs text-slate-500 pointer-events-none"></i>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Middle Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Strategy</label>
                                <div className="relative">
                                    <select
                                        className={`w-full appearance-none rounded-lg border border-slate-800 bg-[#151A25] px-4 py-2.5 text-sm text-white ${theme.focusBorder} outline-none`}
                                        value={formData.strategyId}
                                        onChange={e => {
                                            const selectedId = e.target.value;
                                            const selectedStrategy = activeStrategies.find(s => s.id === selectedId);
                                            setFormData({
                                                ...formData,
                                                strategyId: selectedId,
                                                strategy: selectedStrategy?.name || ''
                                            });
                                        }}
                                    >
                                        <option value="">Select a strategy</option>
                                        {activeStrategies.map(strategy => {
                                            const versions = activeStrategies.filter(s => s.name === strategy.name);
                                            const label = versions.length > 1 ? `${strategy.name} (v${strategy.version})` : strategy.name;
                                            return <option key={strategy.id} value={strategy.id}>{label}</option>;
                                        })}
                                    </select>
                                    <i className="fa-solid fa-chevron-down absolute right-4 top-3.5 text-xs text-slate-500 pointer-events-none"></i>
                                </div>
                            </div>

                            <InputGroup label="Entry Price" focusClass={theme.focusBorder}>
                                <div className="relative w-full flex items-center">
                                    <input required type="number" placeholder="0.00" className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none font-mono pr-8" value={formData.entryPrice} onChange={e => handleEntryPriceChange(e.target.value)} />
                                    <button type="button" onClick={() => fetchLivePrice(formData.symbol, 'entry')} disabled={isFetchingEntry || !formData.symbol} className="absolute right-0 p-1 text-slate-500 hover:text-white transition-colors disabled:opacity-50">
                                        <i className={`fa-solid ${isFetchingEntry ? 'fa-circle-notch fa-spin' : 'fa-arrows-rotate'}`}></i>
                                    </button>
                                </div>
                            </InputGroup>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Capital (USD)</label>
                                    {entryMode === 'LIVE' && (
                                        <button
                                            type="button"
                                            onClick={() => setIsCalculatingByRisk(!isCalculatingByRisk)}
                                            className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-all ${isCalculatingByRisk ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'text-slate-500 border-slate-800 hover:text-slate-300'}`}
                                        >
                                            {isCalculatingByRisk ? 'Sizing by Risk %' : 'Sizing by Margin'}
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className={`flex items-center rounded-lg border border-slate-800 bg-[#151A25] px-4 py-2.5 ${theme.focusBorder} transition-colors ${isCalculatingByRisk ? 'opacity-50' : ''}`}>
                                        <input
                                            required
                                            disabled={isCalculatingByRisk}
                                            type="number"
                                            placeholder="0"
                                            className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none font-mono"
                                            value={formData.capital}
                                            onChange={e => setFormData({ ...formData, capital: e.target.value })}
                                        />
                                    </div>

                                    {isCalculatingByRisk && entryMode === 'LIVE' ? (
                                        <div className="mt-1 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 space-y-3 animate-in zoom-in-95 duration-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] font-bold text-indigo-300 uppercase">Risk Calculation</span>
                                                <span className="text-[9px] font-bold text-slate-500">${portfolioBalance.toLocaleString()} bal</span>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex-1 space-y-1">
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Risk %</span>
                                                    <div className="flex items-center rounded bg-[#0B0E14] border border-slate-700 px-2 py-1">
                                                        <input
                                                            type="number"
                                                            className="w-full bg-transparent text-xs text-white outline-none font-mono"
                                                            value={riskPercent}
                                                            onChange={e => setRiskPercent(e.target.value)}
                                                        />
                                                        <span className="text-[9px] text-slate-500 font-bold ml-1">%</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Risk Amount</span>
                                                    <div className="flex items-center rounded bg-[#0B0E14]/50 border border-slate-800 px-2 py-1 h-[26px]">
                                                        <span className="text-xs text-white font-mono font-bold">${((portfolioBalance * (parseFloat(riskPercent) || 0)) / 100).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                                                {riskPresets.map(preset => (
                                                    <button
                                                        key={preset}
                                                        type="button"
                                                        onClick={() => setRiskPercent(preset.toString())}
                                                        className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${parseFloat(riskPercent) === preset ? 'bg-indigo-500/30 text-indigo-300 border-indigo-500/50' : 'bg-black/20 text-slate-500 border-slate-800 hover:text-slate-300'}`}
                                                    >
                                                        {preset}%
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="text-[9px] text-slate-400 italic">
                                                {!formData.stopLoss ? '⚠️ Set SL price to calculate.' : '✅ Sizing adjusted.'}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            {[25, 50, 75, 100].map(pct => (
                                                <button key={pct} type="button" onClick={() => setCapitalByPercent(pct)} className="flex-1 rounded border border-slate-800 bg-[#0F1218] py-1 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all">{pct}%</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Leverage</label>
                                <div className="flex flex-col gap-2">
                                    <div className={`flex items-center rounded-lg border border-slate-800 bg-[#151A25] px-4 py-2.5 ${theme.focusBorder} transition-colors`}>
                                        <input type="number" className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none font-mono" value={formData.leverage} onChange={e => setFormData({ ...formData, leverage: parseFloat(e.target.value) })} />
                                        <span className="text-xs text-slate-500 font-bold">x</span>
                                    </div>
                                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                                        {leveragePresets.map(lev => (
                                            <button key={lev} type="button" onClick={() => setFormData({ ...formData, leverage: lev })} className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${formData.leverage === lev ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-800 bg-[#0F1218] text-slate-400 hover:text-white'}`}>
                                                {lev}x
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Exit Fields for Non-Live */}
                        {entryMode !== 'LIVE' && (
                            <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-[#151A25]/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exit Price</label>
                                    <div className={`flex items-center rounded-lg border border-slate-700 bg-[#0B0E14] px-4 py-2.5 ${theme.focusBorder} transition-colors`}>
                                        <div className="relative w-full flex items-center">
                                            <input required type="number" placeholder="0.00" className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none font-mono pr-8" value={formData.exitPrice} onChange={e => setFormData({ ...formData, exitPrice: e.target.value })} />
                                            <button type="button" onClick={() => fetchLivePrice(formData.symbol, 'exit')} disabled={isFetchingExit || !formData.symbol} className="absolute right-0 p-1 text-slate-500 hover:text-white transition-colors disabled:opacity-50">
                                                <i className={`fa-solid ${isFetchingExit ? 'fa-circle-notch fa-spin' : 'fa-arrows-rotate'}`}></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exit Date & Time</label>
                                    <div className={`flex items-center rounded-lg border border-slate-700 bg-[#0B0E14] px-4 py-2.5 ${theme.focusBorder} transition-colors`}>
                                        <i className="fa-regular fa-calendar text-slate-500 mr-3"></i>
                                        <input type="datetime-local" className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none [color-scheme:dark]" value={formData.exitDate} onChange={e => setFormData({ ...formData, exitDate: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exit Quality</label>
                                    <div className="flex gap-2 items-center h-full">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, exitQuality: star })}
                                                className="p-1 transition-transform hover:scale-110 focus:outline-none"
                                            >
                                                <i className={`text-lg fa-star ${star <= (formData.exitQuality || 0) ? 'fa-solid text-yellow-400' : 'fa-regular text-slate-600'}`}></i>
                                            </button>
                                        ))}
                                        <span className="ml-2 text-[10px] text-slate-500 font-medium">
                                            {formData.exitQuality ? `${formData.exitQuality}/5` : 'Rate'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Stop Loss & Take Profit */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stop Loss</label>
                                <div className="flex gap-0 rounded-lg border border-slate-800 bg-[#151A25] focus-within:border-rose-500 transition-colors overflow-hidden">
                                    <div className="flex-1 flex flex-col px-4 py-2 border-r border-slate-800/50">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Price</span>
                                        <input type="number" placeholder="0.00" className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none font-mono" value={formData.stopLoss} onChange={e => handleSlPriceChange(e.target.value)} />
                                    </div>
                                    <div className="w-24 flex flex-col px-4 py-2 bg-[#0B0E14]/30">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">%</span>
                                        <input type="number" placeholder="%" className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none font-mono" value={slPercent} onChange={e => setPriceByPercent('SL', parseFloat(e.target.value))} />
                                    </div>
                                </div>
                                <div className="flex gap-1.5 mt-1">
                                    {slPresets.map(pct => (
                                        <button key={pct} type="button" onClick={() => setPriceByPercent('SL', pct)} className="flex-1 py-1 rounded bg-rose-900/20 border border-rose-900/30 text-[10px] font-bold text-rose-400 hover:bg-rose-900/40 transition-all">{pct}%</button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Take Profit</label>
                                <div className="flex gap-0 rounded-lg border border-slate-800 bg-[#151A25] focus-within:border-emerald-500 transition-colors overflow-hidden">
                                    <div className="flex-1 flex flex-col px-4 py-2 border-r border-slate-800/50">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Price</span>
                                        <input type="number" placeholder="0.00" className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none font-mono" value={formData.takeProfit} onChange={e => handleTpPriceChange(e.target.value)} />
                                    </div>
                                    <div className="w-24 flex flex-col px-4 py-2 bg-[#0B0E14]/30">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">%</span>
                                        <input type="number" placeholder="%" className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none font-mono" value={tpPercent} onChange={e => setPriceByPercent('TP', parseFloat(e.target.value))} />
                                    </div>
                                </div>
                                <div className="flex gap-1.5 mt-1">
                                    {tpPresets.map(pct => (
                                        <button key={pct} type="button" onClick={() => setPriceByPercent('TP', pct)} className="flex-1 py-1 rounded bg-emerald-900/20 border border-emerald-900/30 text-[10px] font-bold text-emerald-400 hover:bg-emerald-900/40 transition-all">{pct}%</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Calculations Panel */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 rounded-xl bg-[#0F1218] border border-slate-800/50 p-6">
                            <div><p className="text-[10px] font-bold text-slate-500 mb-1">Position Size</p><p className="text-2xl font-bold text-white font-mono">${metrics.positionSize.toLocaleString()}</p></div>

                            {(activeAsset?.category === 'Forex' || formData.symbol.length === 6) ? (
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-400 mb-1 flex items-center gap-1">
                                        <i className="fa-solid fa-calculator"></i> Forex Pips & Lots
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-2xl font-bold text-white font-mono">{metrics.lots.toFixed(2)}</p>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase">Lots</span>
                                        <p className="text-lg font-bold text-indigo-400 font-mono ml-2">${metrics.pipValue.toFixed(2)}</p>
                                        <span className="text-[9px] text-slate-500 font-bold uppercase">/Pip</span>
                                    </div>
                                    <p className="text-[9px] text-slate-600 mt-1">{metrics.pips.toFixed(1)} pips distance @ standard lot units</p>
                                </div>
                            ) : (
                                <div className="relative group">
                                    <p className="text-[10px] font-bold text-emerald-500 mb-1 flex items-center gap-1 cursor-pointer hover:text-emerald-400 group/fee transition-colors" onClick={() => onJumpToPortfolio ? onJumpToPortfolio() : onEditFees?.()}>
                                        $ Est. Total Fee <i className="fa-solid fa-sliders text-[10px] ml-1 group-hover/fee:scale-110 transition-transform" title="Configure Fees in Portfolio"></i>
                                    </p>
                                    <p className="text-2xl font-bold text-white font-mono">${metrics.estFees.toFixed(2)}</p>
                                    <p className="text-[10px] text-slate-500">Round trip</p>
                                </div>
                            )}

                            <div>
                                <p className="text-[10px] font-bold text-rose-500 mb-1 flex items-center gap-1"><i className="fa-solid fa-skull"></i> Est. Liquidation</p>
                                <p className="text-2xl font-bold text-rose-400 font-mono">{metrics.liquidationPrice > 0 ? metrics.liquidationPrice.toFixed(2) : 'N/A'}</p>
                                <p className="text-[10px] text-slate-500">Distance: {formData.entryPrice && metrics.liquidationPrice ? (Math.abs(parseFloat(formData.entryPrice) - metrics.liquidationPrice) / parseFloat(formData.entryPrice) * 100).toFixed(1) + '%' : 'Enter price'}</p>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-slate-500 mb-1">Base Units (Qty)</p>
                                <p className="text-2xl font-bold text-white font-mono">{metrics.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                            </div>
                        </div>

                        {/* Strategy Validation Section */}
                        {selectedStrategyObj && entryMode !== 'PAST' && (
                            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5 space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <i className="fa-solid fa-clipboard-check text-indigo-400"></i>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{selectedStrategyObj.name} Validation</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* 1. Mandatory Checklist (Primary) */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                                            <i className="fa-solid fa-asterisk text-[8px]"></i> Entry Rules (Mandatory)
                                        </label>
                                        {(selectedStrategyObj.entryRules?.primary || []).length > 0 ? (
                                            <div className="space-y-2">
                                                {(selectedStrategyObj.entryRules.primary || []).map((rule, idx) => {
                                                    const isChecked = checkedRules.includes(rule);
                                                    return (
                                                        <div
                                                            key={`p-${idx}`}
                                                            onClick={() => {
                                                                if (isChecked) setCheckedRules(prev => prev.filter(r => r !== rule));
                                                                else setCheckedRules(prev => [...prev, rule]);
                                                            }}
                                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked
                                                                ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                                                                : 'bg-[#0B0E14] border-slate-800 text-slate-400 hover:border-slate-600'
                                                                }`}
                                                        >
                                                            <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                                                                {isChecked && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                                                            </div>
                                                            <span className="text-xs font-medium">{rule}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500 italic">No mandatory rules defined.</p>
                                        )}
                                    </div>

                                    {/* 2. Optional Checklist (Secondary) */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Additional Rules (Optional)</label>
                                        {(selectedStrategyObj.entryRules?.secondary || []).length > 0 ? (
                                            <div className="space-y-2">
                                                {(selectedStrategyObj.entryRules.secondary || []).map((rule, idx) => {
                                                    const isChecked = checkedRules.includes(rule);
                                                    return (
                                                        <div
                                                            key={`s-${idx}`}
                                                            onClick={() => {
                                                                if (isChecked) setCheckedRules(prev => prev.filter(r => r !== rule));
                                                                else setCheckedRules(prev => [...prev, rule]);
                                                            }}
                                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked
                                                                ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                                                                : 'bg-[#0B0E14] border-slate-800 text-slate-400 hover:border-slate-600'
                                                                }`}
                                                        >
                                                            <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                                                                {isChecked && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                                                            </div>
                                                            <span className="text-xs font-medium">{rule}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500 italic">No secondary rules defined.</p>
                                        )}
                                    </div>

                                    {/* 3. Setups Selection */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valid Setups</label>
                                        {(selectedStrategyObj.setups || []).length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {(selectedStrategyObj.setups || []).map((setup, idx) => {
                                                    const isSelected = selectedSetups.includes(setup);
                                                    return (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => {
                                                                if (isSelected) setSelectedSetups(prev => prev.filter(s => s !== setup));
                                                                else setSelectedSetups(prev => [...prev, setup]);
                                                            }}
                                                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${isSelected
                                                                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                                                                : 'bg-[#0B0E14] border-slate-800 text-slate-400 hover:border-slate-600'
                                                                }`}
                                                        >
                                                            {setup}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500 italic">No setups defined.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tags & Notes */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-800/50">
                            <div className="space-y-6">
                                {/* Entry Reasons */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entry Reasons</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Add reason..."
                                            className="flex-1 bg-[#151A25] border border-slate-800 rounded px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                                            value={entryReasonInput}
                                            onChange={(e) => setEntryReasonInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addTag(entryReasonInput, setEntryReasonInput, entryReasons, setEntryReasons, 'entry')}
                                        />
                                        <button type="button" onClick={() => addTag(entryReasonInput, setEntryReasonInput, entryReasons, setEntryReasons, 'entry')} className="px-3 rounded bg-slate-800 text-slate-300 hover:text-white"><i className="fa-solid fa-plus"></i></button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {entryReasons.map((tag, i) => (
                                            <span key={i} className={getTagStyles(tag)}>
                                                {tag} <i className="fa-solid fa-xmark cursor-pointer hover:text-white" onClick={() => removeTag(tag, entryReasons, setEntryReasons)}></i>
                                            </span>
                                        ))}
                                        {/* Suggestions */}
                                        {availableTags?.['entry']?.slice(0, 3).map(t => !entryReasons.includes(t.name) && (
                                            <button key={t.id} type="button" onClick={() => addTag(t.name, setEntryReasonInput, entryReasons, setEntryReasons, 'entry')} className={`${getTagStyles(t.name)} opacity-60 hover:opacity-100`}>+ {t.name}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Exit Reasons (Only for Past/Data) */}
                                {entryMode !== 'LIVE' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Exit Reasons</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Why did you exit?"
                                                className="flex-1 bg-[#151A25] border border-slate-800 rounded px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                                                value={exitReasonInput}
                                                onChange={(e) => setExitReasonInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addTag(exitReasonInput, setExitReasonInput, exitReasons, setExitReasons, 'exit')}
                                            />
                                            <button type="button" onClick={() => addTag(exitReasonInput, setExitReasonInput, exitReasons, setExitReasons, 'exit')} className="px-3 rounded bg-slate-800 text-slate-300 hover:text-white"><i className="fa-solid fa-plus"></i></button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {exitReasons.map((tag, i) => (
                                                <span key={i} className={getTagStyles(tag)}>
                                                    {tag} <i className="fa-solid fa-xmark cursor-pointer hover:text-white" onClick={() => removeTag(tag, exitReasons, setExitReasons)}></i>
                                                </span>
                                            ))}
                                            {/* Suggestions */}
                                            {availableTags?.['exit']?.slice(0, 3).map(t => !exitReasons.includes(t.name) && (
                                                <button key={t.id} type="button" onClick={() => addTag(t.name, setExitReasonInput, exitReasons, setExitReasons, 'exit')} className={`${getTagStyles(t.name)} opacity-60 hover:opacity-100`}>+ {t.name}</button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Mental State */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mental State</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="How do you feel?"
                                            className="flex-1 bg-[#151A25] border border-slate-800 rounded px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                                            value={mentalStateInput}
                                            onChange={(e) => setMentalStateInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addTag(mentalStateInput, setMentalStateInput, mentalStates, setMentalStates, 'mental')}
                                        />
                                        <button type="button" onClick={() => addTag(mentalStateInput, setMentalStateInput, mentalStates, setMentalStates, 'mental')} className="px-3 rounded bg-slate-800 text-slate-300 hover:text-white"><i className="fa-solid fa-plus"></i></button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {mentalStates.map((tag, i) => (
                                            <span key={i} className={getTagStyles(tag)}>
                                                {tag} <i className="fa-solid fa-xmark cursor-pointer hover:text-white" onClick={() => removeTag(tag, mentalStates, setMentalStates)}></i>
                                            </span>
                                        ))}
                                        {/* Suggestions */}
                                        {availableTags?.['mental']?.slice(0, 3).map(t => !mentalStates.includes(t.name) && (
                                            <button key={t.id} type="button" onClick={() => addTag(t.name, setMentalStateInput, mentalStates, setMentalStates, 'mental')} className={`${getTagStyles(t.name)} opacity-60 hover:opacity-100`}>+ {t.name}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* General Tags */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">General Tags</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Any other tags..."
                                            className="flex-1 bg-[#151A25] border border-slate-800 rounded px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                                            value={generalTagInput}
                                            onChange={(e) => setGeneralTagInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addTag(generalTagInput, setGeneralTagInput, generalTags, setGeneralTags, 'general')}
                                        />
                                        <button type="button" onClick={() => addTag(generalTagInput, setGeneralTagInput, generalTags, setGeneralTags, 'general')} className="px-3 rounded bg-slate-800 text-slate-300 hover:text-white"><i className="fa-solid fa-plus"></i></button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {generalTags.map((tag, i) => (
                                            <span key={i} className={getTagStyles(tag)}>
                                                {tag} <i className="fa-solid fa-xmark cursor-pointer hover:text-white" onClick={() => removeTag(tag, generalTags, setGeneralTags)}></i>
                                            </span>
                                        ))}
                                        {/* Suggestions */}
                                        {availableTags?.['general']?.slice(0, 3).map(t => !generalTags.includes(t.name) && (
                                            <button key={t.id} type="button" onClick={() => addTag(t.name, setGeneralTagInput, generalTags, setGeneralTags, 'general')} className={`${getTagStyles(t.name)} opacity-60 hover:opacity-100`}>+ {t.name}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Trade Notes</label>
                                    <textarea
                                        className="w-full bg-[#151A25] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none resize-none h-24 placeholder-slate-600 leading-relaxed"
                                        placeholder="Why did you take this trade? What are you seeing?"
                                        value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="border-t border-slate-800 bg-[#0B0E14] px-6 py-4 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-slate-800 text-slate-400 font-bold text-sm hover:text-white transition-colors">Cancel</button>
                    <button
                        type="submit"
                        form="trade-form"
                        disabled={!formData.symbol || !formData.entryPrice || !formData.capital || (selectedStrategyObj && !allMandatoryChecked) || !isExitValid || shouldBlockEntry}
                        className={`px-8 py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center gap-2 ${!formData.symbol || !formData.entryPrice || !formData.capital || !isExitValid || shouldBlockEntry
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                            : `${theme.button} shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:scale-[1.02]`
                            }`}
                    >
                        <i className={`fa-solid ${shouldBlockEntry ? 'fa-lock' : 'fa-check'}`}></i>
                        {shouldBlockEntry ? 'Locked' : entryMode === 'LIVE' ? 'Execute Trade' : 'Log Trade'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TradeForm;
