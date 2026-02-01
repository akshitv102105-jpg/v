
export enum TradeStatus { OPEN = 'OPEN', CLOSED = 'CLOSED' }
export enum TradeSide { LONG = 'LONG', SHORT = 'SHORT' }

export interface FeeConfig {
    maker: number;
    taker: number;
    type: 'PERCENTAGE' | 'FIXED';
}

export interface ExchangeConfig {
    name: string;
    category: 'Crypto' | 'Forex' | 'Stock' | 'Indices';
    makerFee: number;
    takerFee: number;
    feeType: 'PERCENTAGE' | 'FIXED';
    maxLeverage: number;
    icon?: string;
}

export interface ThemeConfig {
    primary: string;
    secondary: string;
    gradient?: string;
}

export interface AppPreferences {
    enableAnimations: boolean;
    includeImportPnl: boolean;
    fontFamily?: string;
}

export interface UserProfile {
    nickname: string;
    bio: string;
    primaryExchange: string;
    timezone: string;
    fees: FeeConfig;
    exchangeFees?: Record<string, FeeConfig>;
    theme?: ThemeConfig;
    preferences?: AppPreferences;

    // Customization
    avatarImage?: string;
    bannerImage?: string;
    secondaryImage?: string;

    // Auth & Gamification
    email?: string;
    level?: number;
    xp?: number;
    hp?: number;
    mana?: number;
    comboMultiplier?: number;
    characterType?: string;

    // Trading Presets
    slPresets?: number[];
    tpPresets?: number[];
    leveragePresets?: number[];
    riskPresets?: number[];
    favoriteSymbols?: string[];
    exchanges?: string[];
}

export const TIMEZONES = [
    "UTC", "Africa/Abidjan", "Africa/Accra", "Africa/Addis_Ababa", "Africa/Algiers", "Africa/Asmara", "Africa/Bamako",
    "Africa/Bangui", "Africa/Banjul", "Africa/Bissau", "Africa/Blantyre", "Africa/Brazzaville", "Africa/Bujumbura",
    "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Asia/Kolkata", "Asia/Singapore"
];

export interface Tag {
    id: string;
    name: string;
    color: string;
    category: string;
    isBold?: boolean;
    hasGlow?: boolean;
}

export const TAG_COLORS: Record<string, { bg: string, border: string, text: string, dot: string, glow: string }> = {
    purple: { bg: 'bg-[#8B5CF6]/10', border: 'border-[#8B5CF6]/20', text: 'text-[#A78BFA]', dot: 'bg-[#8B5CF6]', glow: 'shadow-[0_0_10px_rgba(139,92,246,0.5)]' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500', glow: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-500', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.5)]' },
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', dot: 'bg-rose-500', glow: 'shadow-[0_0_10px_rgba(244,63,94,0.5)]' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-500', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.5)]' },
    slate: { bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-400', dot: 'bg-slate-500', glow: 'shadow-[0_0_10px_rgba(100,116,139,0.5)]' },
};

export interface Strategy {
    id: string;
    name: string;
    description: string;
    version: number;
    status: 'active' | 'inactive';
    stats: {
        totalTrades: number;
        winRate: number;
        profitFactor: number;
        netRoi: number;
        totalPnl: number;
    };
    setups: string[];
    sizingRules: string[];
    riskParams: {
        maxRiskPerTrade?: number;
        minRR?: number;
        dailyMaxDD?: number;
    };
    entryRules: {
        primary: string[];
        secondary: string[];
    };
    exitRules: {
        primary: string[];
        secondary: string[];
    };
    // Backward compatibility (optional)
    rules?: string[];
    entryTriggers?: string[];
}

// --- Trade Interface ---
export type TradeType = 'LIVE' | 'JOURNAL' | 'PAST' | 'DATA';

export interface Trade {
    id: string;
    symbol: string;
    side: TradeSide;
    entryPrice: number;
    exitPrice?: number;
    quantity: number;
    leverage: number;
    capital: number; // Single trade margin/cost
    status: TradeStatus;
    entryDate: string;
    exitDate?: string;
    riskReward: number;

    pnl?: number;
    pnlPercentage?: number;

    strategy?: string;
    strategyId?: string;
    setups?: string[];
    entryReasons?: string[];
    mentalState?: string[];
    tags?: string[];
    entryChecklist?: string[];
    exitChecklist?: string[];

    exitReasons?: string[];
    exitQuality?: number; // 1-5 stars

    notes?: string;

    // Fees & Exchange
    fees?: number;
    exchange?: string;

    tradeType?: TradeType;
    source?: 'MANUAL' | 'CSV';
    accountId?: string;

    stopLoss?: number;
    takeProfit?: number;

    // New fields
    images?: string[];
    isDisciplined?: boolean;
    xpEarned?: number;
}

// --- Analytics Types ---
export type DateFilterType = 'LIFETIME' | 'RELATIVE' | 'ABSOLUTE';

export interface DateFilterState {
    type: DateFilterType;
    days?: number;
    range?: { start: string; end: string; };
}

// --- Habits & Focus ---
export interface Habit {
    id: string;
    name: string;
    frequency?: 'daily' | 'weekly';
    streak?: number;
}

export type HabitCompletions = Record<string, boolean>;

export interface FocusTask {
    id: string;
    text: string;
    completed: boolean;
    color: 'blue' | 'amber';
    isBold?: boolean;
    hasGlow?: boolean;
}

export interface ProfitGoals {
    daily: { target: number; active: boolean };
    weekly: { target: number; active: boolean };
    monthly: { target: number; active: boolean };
}

export interface RiskSettings {
    maxRiskPerTrade: number;
    maxTradesDay: number;
    maxTradesWeek: number;
    dailyDD: number;
    weeklyDD: number;
    monthlyDD: number;
}

export interface RiskState {
    isLocked: boolean;
    lockReason?: string;
    maxTrades: number;
    tradeCount: number;
    dailyDDLimit: number;
    currentDD: number;
}

export type View = 'dashboard' | 'journal' | 'playbook' | 'analytics' | 'settings' | 'portfolio' | 'profile' | 'habit-tracker' | 'data-lab' | 'achievements' | 'guru-ji';

export const getCurrencyFormatter = (currency: string) => {
    const symbol = currency === 'USD' || currency === 'USDT' ? '$' : currency === 'INR' ? '₹' : '€';
    return {
        format: (val: number) => `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        symbol,
        convert: (val: number) => val
    }
};

export interface JournalEntry {
    id: string;
    date: string;
    type: 'Daily' | 'Weekly' | 'Monthly';
    content: {
        marketObservations: string;
        selfReflection: string;
        lessonsLearned: string;
    };
    mood?: string;
    tags?: string[];
    image?: string;
    title?: string;
}

export interface Account {
    id: string;
    name: string;
    currency: string;
    icon: string;
    color: string;
    isExclusive?: boolean;
    exchange?: string;
    fees?: FeeConfig;
    leverage?: number;
    favoriteSymbols?: string[];
}

export interface Transaction {
    id: string;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amount: number;
    date: string;
    note: string;
    accountId: string;
}
export interface Achievement {
    id: string;
    title: string;
    description: string;
    difficulty: number; // 1-10
    tier: 'Beginner' | 'Bronze' | 'Silver' | 'Gold';
    category: 'PnL' | 'Discipline' | 'Consistency' | 'Education' | 'Guru';
    condition: {
        type: 'trades_count' | 'win_rate' | 'pnl_gain' | 'streak' | 'journal_count';
        target: number;
    };
    progress: number;
    isUnlocked: boolean;
    unlockedAt?: string;
    month: string; // YYYY-MM
}

export interface AchievementState {
    achievements: Achievement[];
    lastGeneratedMonth: string; // YYYY-MM
}
