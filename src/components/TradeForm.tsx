
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trade, TradeSide, TradeStatus, Strategy, FeeConfig, Tag, TAG_COLORS, TradeType, RiskState } from '../types';

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
}

const TRADING_ASSETS = [
    // Crypto
    { symbol: 'BTC', name: 'Bitcoin', icon: 'fa-brands fa-bitcoin', color: 'text-amber-500', category: 'Crypto' },
    { symbol: 'ETH', name: 'Ethereum', icon: 'fa-brands fa-ethereum', color: 'text-indigo-400', category: 'Crypto' },
    { symbol: 'SOL', name: 'Solana', icon: 'fa-solid fa-layer-group', color: 'text-emerald-400', category: 'Crypto' },
    { symbol: 'XRP', name: 'Ripple', icon: 'fa-solid fa-droplet', color: 'text-blue-400', category: 'Crypto' },
    { symbol: 'BNB', name: 'Binance Coin', icon: 'fa-solid fa-coins', color: 'text-yellow-400', category: 'Crypto' },
    { symbol: 'ADA', name: 'Cardano', icon: 'fa-solid fa-certificate', color: 'text-blue-600', category: 'Crypto' },
    { symbol: 'DOGE', name: 'Dogecoin', icon: 'fa-solid fa-dog', color: 'text-amber-300', category: 'Crypto' },
    { symbol: 'TRX', name: 'Tron', icon: 'fa-solid fa-diamond', color: 'text-rose-500', category: 'Crypto' },
    { symbol: 'DOT', name: 'Polkadot', icon: 'fa-solid fa-circle-dot', color: 'text-pink-500', category: 'Crypto' },
    { symbol: 'MATIC', name: 'Polygon', icon: 'fa-solid fa-draw-polygon', color: 'text-purple-500', category: 'Crypto' },
    { symbol: 'LTC', name: 'Litecoin', icon: 'fa-solid fa-litecoin-sign', color: 'text-slate-300', category: 'Crypto' },
    { symbol: 'SHIB', name: 'Shiba Inu', icon: 'fa-solid fa-shield-dog', color: 'text-orange-400', category: 'Crypto' },
    { symbol: 'AVAX', name: 'Avalanche', icon: 'fa-solid fa-mountain', color: 'text-rose-500', category: 'Crypto' },
    { symbol: 'LINK', name: 'Chainlink', icon: 'fa-solid fa-link', color: 'text-blue-500', category: 'Crypto' },
    { symbol: 'NEAR', name: 'Near Protocol', icon: 'fa-solid fa-circle', color: 'text-slate-200', category: 'Crypto' },
    { symbol: 'ATOM', name: 'Cosmos', icon: 'fa-solid fa-atom', color: 'text-indigo-300', category: 'Crypto' },
    { symbol: 'UNI', name: 'Uniswap', icon: 'fa-solid fa-horse', color: 'text-pink-400', category: 'Crypto' },
    { symbol: 'PEPE', name: 'Pepe', icon: 'fa-solid fa-frog', color: 'text-emerald-600', category: 'Crypto' },
    { symbol: 'FTM', name: 'Fantom', icon: 'fa-solid fa-ghost', color: 'text-blue-500', category: 'Crypto' },
    { symbol: 'INJ', name: 'Injective', icon: 'fa-solid fa-syringe', color: 'text-blue-400', category: 'Crypto' },
    { symbol: 'TIA', name: 'Celestia', icon: 'fa-solid fa-bahai', color: 'text-indigo-400', category: 'Crypto' },
    { symbol: 'SEI', name: 'Sei', icon: 'fa-solid fa-water', color: 'text-rose-500', category: 'Crypto' },
    { symbol: 'JUP', name: 'Jupiter', icon: 'fa-solid fa-planet-ring', color: 'text-emerald-400', category: 'Crypto' },
    { symbol: 'RNDR', name: 'Render Token', icon: 'fa-solid fa-square-person-confined', color: 'text-orange-500', category: 'Crypto' },
    { symbol: 'FET', name: 'Fetch.ai', icon: 'fa-solid fa-brain', color: 'text-indigo-600', category: 'Crypto' },

    // Forex
    { symbol: 'EURUSD', name: 'Euro / US Dollar', icon: 'fa-solid fa-euro-sign', color: 'text-blue-400', category: 'Forex' },
    { symbol: 'GBPUSD', name: 'British Pound / US Dollar', icon: 'fa-solid fa-sterling-sign', color: 'text-indigo-500', category: 'Forex' },
    { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', icon: 'fa-solid fa-yen-sign', color: 'text-rose-400', category: 'Forex' },
    { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', icon: 'fa-solid fa-austral-sign', color: 'text-emerald-500', category: 'Forex' },
    { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', icon: 'fa-solid fa-dollar-sign', color: 'text-rose-500', category: 'Forex' },
    { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', icon: 'fa-solid fa-franc-sign', color: 'text-blue-300', category: 'Forex' },
    { symbol: 'NZDUSD', name: 'NZ Dollar / US Dollar', icon: 'fa-solid fa-dollar-sign', color: 'text-teal-400', category: 'Forex' },

    // Commodities
    { symbol: 'XAUUSD', name: 'Gold / US Dollar', icon: 'fa-solid fa-ring', color: 'text-amber-400', category: 'Commodities' },
    { symbol: 'XAGUSD', name: 'Silver / US Dollar', icon: 'fa-solid fa-coins', color: 'text-slate-400', category: 'Commodities' },
    { symbol: 'USOIL', name: 'Crude Oil WTI', icon: 'fa-solid fa-droplet', color: 'text-slate-800', category: 'Commodities' },
    { symbol: 'UKOIL', name: 'Brent Crude Oil', icon: 'fa-solid fa-oil-can', color: 'text-slate-700', category: 'Commodities' },
    { symbol: 'NG', name: 'Natural Gas', icon: 'fa-solid fa-fire-flame-simple', color: 'text-blue-200', category: 'Commodities' },
];

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
    defaultExchange = 'Binance',
    userTimezone = 'UTC',
    portfolioBalance = 0,
    userFees = { maker: 0.02, taker: 0.05, type: 'PERCENTAGE' },
    exchangeFees,
    onEditFees,
    riskState,
    initialSymbol = '',
    trades = []
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
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeAsset, setActiveAsset] = useState<typeof TRADING_ASSETS[0] | null>(null);
    const [isFetchingEntry, setIsFetchingEntry] = useState(false);
    const [isFetchingExit, setIsFetchingExit] = useState(false);
    const [binanceSymbols, setBinanceSymbols] = useState<any[]>([]);

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
        quantity: 0
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
        const capital = parseFloat(formData.capital) || 0;
        const entry = parseFloat(formData.entryPrice) || 0;
        const lev = formData.leverage || 1;

        const positionSize = capital * lev;
        const qty = entry > 0 ? positionSize / entry : 0;

        const activeFeeConfig = (formData.exchange && exchangeFees?.[formData.exchange]) || userFees;

        let fees = 0;
        if (activeFeeConfig.type === 'FIXED') {
            fees = (activeFeeConfig.taker || 0) * 2;
        } else {
            const rate = (activeFeeConfig.taker || 0.05) / 100;
            fees = (positionSize * rate) * 2;
        }

        let liq = 0;
        if (entry > 0) {
            if (formData.side === TradeSide.LONG) {
                liq = entry * (1 - (1 / lev) + 0.005);
            } else {
                liq = entry * (1 + (1 / lev) - 0.005);
            }
        }

        setMetrics({
            positionSize,
            estFees: fees,
            liquidationPrice: Math.max(0, liq),
            quantity: qty
        });
    }, [formData.capital, formData.entryPrice, formData.leverage, formData.side, userFees, exchangeFees, formData.exchange]);

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

            // Split common pairs like EURUSD or XAUUSD
            if (normalizedSymbol.length === 6) {
                fsym = normalizedSymbol.substring(0, 3);
                tsym = normalizedSymbol.substring(3);
            } else if (normalizedSymbol.endsWith('USD')) {
                fsym = normalizedSymbol.replace('USD', '');
            }

            const ccResponse = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${fsym}&tsyms=${tsym},USDT,USD`);
            if (ccResponse.ok) {
                const ccData = await ccResponse.json();
                const priceVal = ccData[tsym] || ccData.USDT || ccData.USD;
                if (priceVal) {
                    const price = priceVal.toString();
                    if (field === 'entry') handleEntryPriceChange(price);
                    else setFormData(prev => ({ ...prev, exitPrice: price }));
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
        if (!query) return TRADING_ASSETS.slice(0, 10);

        // 1. Filter predefined assets
        const predefined = TRADING_ASSETS.filter(
            asset => asset.symbol.includes(query) || asset.name.toUpperCase().includes(query)
        );

        // 2. Filter Binance symbols if search query exists
        const dynamic = binanceSymbols.filter(
            s => (s.symbol.includes(query) || s.name.toUpperCase().includes(query)) &&
                !TRADING_ASSETS.some(t => t.symbol === s.symbol)
        ).slice(0, 15); // Limit dynamic results for cleaner UI

        return [...predefined, ...dynamic];
    }, [formData.symbol, binanceSymbols]);

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
                                <InputGroup label="Symbol" customIcon={activeAsset ? <i className={`${activeAsset.icon} ${activeAsset.color}`}></i> : <i className="fa-solid fa-coins text-slate-500"></i>} focusClass={theme.focusBorder}>
                                    <input required type="text" placeholder="e.g. BTC" className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none uppercase" value={formData.symbol} onChange={handleSymbolChange} onFocus={() => setShowSuggestions(true)} onBlur={handleSymbolBlur} />
                                </InputGroup>
                                {showSuggestions && filteredAssets.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-700 bg-[#151A25] shadow-xl custom-scrollbar">
                                        {filteredAssets.map((asset) => (
                                            <div key={asset.symbol} onClick={() => selectSymbol(asset)} className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-slate-800 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B0E14] border border-slate-800 ${asset.color}`}><i className={asset.icon}></i></div>
                                                    <div><p className="text-sm font-bold text-white">{asset.symbol}</p><p className="text-xs text-slate-500">{asset.name}</p></div>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-500 bg-black/40 px-1.5 py-0.5 rounded border border-slate-800 uppercase tracking-tighter">{asset.category}</span>
                                            </div>
                                        ))}
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
                                    <select className={`w-full appearance-none rounded-lg border border-slate-800 bg-[#151A25] px-4 py-2.5 text-sm text-white ${theme.focusBorder} outline-none`} value={formData.exchange} onChange={e => setFormData({ ...formData, exchange: e.target.value })}>
                                        {availableExchanges.map(ex => (<option key={ex} value={ex}>{ex}</option>))}
                                    </select>
                                    <i className="fa-solid fa-chevron-down absolute right-4 top-3.5 text-xs text-slate-500 pointer-events-none"></i>
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
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                                    <span>Capital (USD)</span>
                                    <span className="text-emerald-400 normal-case">Avail: ${portfolioBalance.toLocaleString()}</span>
                                </label>
                                <div className="flex flex-col gap-2">
                                    <div className={`flex items-center rounded-lg border border-slate-800 bg-[#151A25] px-4 py-2.5 ${theme.focusBorder} transition-colors`}>
                                        <input required type="number" placeholder="0" className="w-full bg-transparent text-sm text-white placeholder-slate-600 outline-none font-mono" value={formData.capital} onChange={e => setFormData({ ...formData, capital: e.target.value })} />
                                    </div>
                                    <div className="flex gap-2">
                                        {[25, 50, 75, 100].map(pct => (
                                            <button key={pct} type="button" onClick={() => setCapitalByPercent(pct)} className="flex-1 rounded border border-slate-800 bg-[#0F1218] py-1 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all">{pct}%</button>
                                        ))}
                                    </div>
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
                                        {[1, 5, 10, 25, 50, 100].map(lev => (
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
                                    {[1, 2, 5, 10].map(pct => (
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
                                    {[1, 2, 5, 10].map(pct => (
                                        <button key={pct} type="button" onClick={() => setPriceByPercent('TP', pct)} className="flex-1 py-1 rounded bg-emerald-900/20 border border-emerald-900/30 text-[10px] font-bold text-emerald-400 hover:bg-emerald-900/40 transition-all">{pct}%</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Calculations Panel */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 rounded-xl bg-[#0F1218] border border-slate-800/50 p-6">
                            <div><p className="text-[10px] font-bold text-slate-500 mb-1">Calculated Position Size</p><p className="text-2xl font-bold text-white font-mono">${metrics.positionSize.toLocaleString()}</p></div>
                            <div className="relative group">
                                <p className="text-[10px] font-bold text-emerald-500 mb-1 flex items-center gap-1 cursor-pointer" onClick={onEditFees}>
                                    $ Est. Total Fee <i className="fa-solid fa-gear text-[10px] opacity-50 group-hover:opacity-100"></i>
                                </p>
                                <p className="text-2xl font-bold text-white font-mono">${metrics.estFees.toFixed(2)}</p>
                                <p className="text-[10px] text-slate-500">Round trip</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-rose-500 mb-1 flex items-center gap-1"><i className="fa-solid fa-skull"></i> Est. Liquidation</p>
                                <p className="text-2xl font-bold text-rose-400 font-mono">{metrics.liquidationPrice > 0 ? metrics.liquidationPrice.toFixed(2) : 'N/A'}</p>
                                <p className="text-[10px] text-slate-500">Enter price & lev</p>
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
