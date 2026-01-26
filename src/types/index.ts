// ==================== ENUMS ====================

export const TradeStatus = {
    OPEN: 'OPEN',
    CLOSED: 'CLOSED'
} as const;
export type TradeStatus = typeof TradeStatus[keyof typeof TradeStatus];

export const TradeSide = {
    LONG: 'LONG',
    SHORT: 'SHORT'
} as const;
export type TradeSide = typeof TradeSide[keyof typeof TradeSide];

// ==================== TYPES ====================

export type View =
    | 'dashboard'
    | 'playbook'
    | 'analytics'
    | 'journal'
    | 'habit-tracker'
    | 'data-lab'
    | 'achievements'
    | 'guru-ji'
    | 'profile'
    | 'portfolio'
    | 'settings';

// ==================== INTERFACES ====================


export type TradeType = 'LIVE' | 'PAST' | 'DATA';

export interface Trade {
    id: string;
    symbol: string;
    side: TradeSide;
    entryPrice: number;
    exitPrice?: number;
    quantity: number;
    leverage: number;
    capital: number;
    pnl?: number;
    pnlPercentage?: number;
    riskReward: number;
    status: TradeStatus;
    entryDate: string;
    exitDate?: string;
    stopLoss?: number;
    takeProfit?: number;
    exchange?: string;
    strategy?: string;
    notes?: string;
    tradeType?: TradeType;
    accountId?: string;
    // Tags and metadata
    entryReasons?: string[];
    exitReasons?: string[];
    setups?: string[];
    mentalState?: string[];
    tags?: string[];
    entryQuality?: number;
    exitQuality?: number;
}

export interface Strategy {
    id: string;
    name: string;
    description?: string;
    version?: number;
    status?: 'active' | 'inactive';
    stats?: {
        totalTrades: number;
        winRate: number;
        avgRR: number;
        netRoi: number;
        totalPnl: number;
    };
    entryRules: {
        primary: string[];
        secondary: string[];
    };
    exitRules: {
        primary: string[];
        secondary: string[];
    };
    setups: string[];
    sizingRules: string[];
    riskParams: {
        maxRiskPerTrade?: number;
        minRR?: number;
        dailyMaxDD?: number;
    };
    tags?: string[];
}

export interface Tag {
    id: string;
    name: string;
    category?: string;
    color?: string;
    isBold?: boolean;
    hasGlow?: boolean;
}

export interface JournalEntry {
    id: string;
    date: string;
    type: 'Daily' | 'Weekly' | 'Monthly';
    content: {
        marketObservations: string;
        selfReflection: string;
        lessonsLearned: string;
    };
}

export interface Habit {
    id: string;
    name: string;
    color?: string;
}

export interface HabitCompletions {
    [key: string]: boolean; // key format: `${habitId}_${dateString}`
}

export interface FocusTask {
    id: string;
    text: string;
    completed: boolean;
    color?: string;
    isBold?: boolean;
    hasGlow?: boolean;
}

export interface ProfitGoals {
    daily: { target: number; active?: boolean };
    weekly: { target: number; active?: boolean };
    monthly: { target: number; active?: boolean };
}

export interface RiskState {
    isLocked: boolean;
    lockReason?: string;
    maxTrades: number;
    tradeCount: number;
    dailyDDLimit: number;
    currentDD: number;
}

export type DateFilterType = 'LIFETIME' | 'RELATIVE' | 'ABSOLUTE';

export interface DateFilterState {
    type: DateFilterType;
    days?: number;
    range?: { start: string; end: string };
}

export const TAG_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; glow: string }> = {
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-500', glow: 'shadow-[0_0_10px_rgba(168,85,247,0.5)]' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500', glow: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-500', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.5)]' },
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', dot: 'bg-rose-500', glow: 'shadow-[0_0_10px_rgba(244,63,94,0.5)]' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-500', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.5)]' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', dot: 'bg-cyan-500', glow: 'shadow-[0_0_10px_rgba(6,182,212,0.5)]' },
};

export interface RiskSettings {
    maxRiskPerTrade: number;
    dailyDD: number;
    weeklyDD: number;
    monthlyDD: number;
    maxTradesDay: number;
    maxTradesWeek: number;
}

export interface FeeConfig {
    maker: number;
    taker: number;
    type: 'PERCENTAGE' | 'FIXED';
}

export interface UserProfile {
    nickname: string;
    bio?: string;
    primaryExchange: string;
    timezone: string;
    fees?: FeeConfig;
}

export interface Transaction {
    id: string;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amount: number;
    date: string;
    note?: string;
    accountId: string;
}

export interface Account {
    id: string;
    name: string;
    currency: string;
    icon: string;
    color: string;
}

// ==================== UTILITIES ====================

interface CurrencyFormatter {
    format: (value: number) => string;
    symbol: string;
    convert: (value: number) => number;
}

// Currency conversion rates (approximate, for display only)
const currencyRates: Record<string, { rate: number; symbol: string }> = {
    USD: { rate: 1, symbol: '$' },
    EUR: { rate: 0.92, symbol: '€' },
    GBP: { rate: 0.79, symbol: '£' },
    INR: { rate: 83.5, symbol: '₹' },
    JPY: { rate: 149.5, symbol: '¥' },
    AUD: { rate: 1.53, symbol: 'A$' },
    CAD: { rate: 1.36, symbol: 'C$' },
};

export const getCurrencyFormatter = (currency: string = 'USD'): CurrencyFormatter => {
    const config = currencyRates[currency] || currencyRates['USD'];

    return {
        symbol: config.symbol,
        convert: (value: number) => value * config.rate,
        format: (value: number) => {
            const converted = value * config.rate;
            return `${config.symbol}${converted.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
        }
    };
};

// ==================== DEFAULT VALUES ====================

export const defaultUserProfile: UserProfile = {
    nickname: 'Trader',
    bio: 'A disciplined trader on a journey to mastery.',
    primaryExchange: 'Binance',
    timezone: 'UTC',
    fees: { maker: 0.02, taker: 0.05, type: 'PERCENTAGE' }
};

export const defaultProfitGoals: ProfitGoals = {
    daily: { target: 1 },
    weekly: { target: 5 },
    monthly: { target: 15 }
};

export const defaultRiskSettings: RiskSettings = {
    maxRiskPerTrade: 2,
    dailyDD: 5,
    weeklyDD: 10,
    monthlyDD: 15,
    maxTradesDay: 5,
    maxTradesWeek: 20
};

export const defaultAccount: Account = {
    id: 'main',
    name: 'Main Trading Account',
    currency: 'USD',
    icon: 'fa-wallet',
    color: 'text-indigo-400'
};
