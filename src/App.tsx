import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Playbook from './components/Playbook';
import Analytics from './components/Analytics';
import Journal from './components/Journal';
import HabitTracker from './components/HabitTracker';
import Portfolio from './components/Portfolio';
import Settings from './components/Settings';
import Auth from './components/Auth';
import TradeForm from './components/TradeForm';
import Guruji from './components/Guruji';
import Achievements from './components/Achievements';
import Profile from './components/Profile';
import DataLab from './components/DataLab'; // Imported DataLab
import { toast } from './components/Toast';
import { useAuth } from './contexts/AuthContext';
import { useTrades } from './hooks/useTrades';
import { useProfile } from './hooks/useProfile';
import { useStrategies } from './hooks/useStrategies';
import { useHabits } from './hooks/useHabits';
import { useJournals } from './hooks/useJournals';
import { useAccounts } from './hooks/useAccounts';
import { useTransactions } from './hooks/useTransactions';
import { useAchievements } from './hooks/useAchievements';
import { Trade, View, UserProfile, Tag, ProfitGoals, RiskSettings, FocusTask, Transaction, Account, TradeStatus, TradeSide, DateFilterState, Strategy } from './types';

// --- Trader Levels ---
const TRADER_LEVELS = [
  { name: 'Novice', minPF: 0, maxDD: 100, minRR: 0, minTrades: 0, color: 'text-slate-500', shadow: 'shadow-slate-500/50', desc: 'Survival & Edge Repair' },
  { name: 'Survivor', minPF: 1.2, maxDD: 25, minRR: 0.1, minTrades: 5, color: 'text-cyan-400', shadow: 'shadow-cyan-400/50', desc: 'Basic Consistency' },
  { name: 'Consistent', minPF: 1.5, maxDD: 20, minRR: 0.25, minTrades: 15, color: 'text-emerald-400', shadow: 'shadow-emerald-400/50', desc: 'Sustainable Edge' },
  { name: 'Warrior', minPF: 2.0, maxDD: 15, minRR: 0.45, minTrades: 30, color: 'text-amber-400', shadow: 'shadow-amber-400/50', desc: 'High-Quality Asymmetry' },
  { name: 'Elite', minPF: 2.8, maxDD: 12, minRR: 0.8, minTrades: 50, color: 'text-rose-400', shadow: 'shadow-rose-400/50', desc: 'Rare Excellence' },
  { name: 'GOD', minPF: 4.0, maxDD: 10, minRR: 1.4, minTrades: 100, color: 'text-purple-400', shadow: 'shadow-purple-500/80', desc: 'Unicorn Status' },
];

const getTraderLevel = (pf: number, dd: number, rr: number, tradeCount: number) => {
  for (let i = TRADER_LEVELS.length - 1; i >= 0; i--) {
    const lvl = TRADER_LEVELS[i];
    if (pf >= lvl.minPF && dd <= lvl.maxDD && rr >= lvl.minRR && tradeCount >= lvl.minTrades) {
      return lvl;
    }
  }
  return TRADER_LEVELS[0];
};

const AppContent: React.FC = () => {
  // Hooks
  const { trades, addTrade, updateTrade, deleteTrade, importTrades, clearAllTrades, clearImportedTrades } = useTrades();
  const { profile, updateProfile } = useProfile();
  const { strategies, addStrategy, updateStrategy, deleteStrategy } = useStrategies();
  const { habits, completions, toggleHabit } = useHabits();
  const { entries: journalEntries, addEntry } = useJournals();
  const { accounts, addAccount, updateAccount, deleteAccount } = useAccounts();
  const { transactions, addTransaction, deleteTransaction } = useTransactions();
  const { achievements, generateForMonth, updateProgress } = useAchievements();

  // Local State (UI only)
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string>('main');
  const [playbookTab, setPlaybookTab] = useState('strategies');
  const [analyticsFilter, setAnalyticsFilter] = useState<DateFilterState>({ type: 'LIFETIME' });

  // ... (keeping other states) ...
  const [availableTags, setAvailableTags] = useState<Record<string, Tag[]>>(() => {
    const saved = localStorage.getItem('vyuha_tags');
    return saved ? JSON.parse(saved) : {
      entry: [{ id: 's1', name: 'Breakout', color: 'purple', category: 'entry', isBold: true }],
      exit: [{ id: 'm1', name: 'Early Exit', color: 'rose', category: 'exit' }],
      mental: [{ id: 'e1', name: 'FOMO', color: 'purple', category: 'mental' }],
      general: [{ id: 'g1', name: 'News', color: 'slate', category: 'general' }]
    };
  });

  const [profitGoals, setProfitGoals] = useState<ProfitGoals>(() => {
    const saved = localStorage.getItem('vyuha_goals');
    return saved ? JSON.parse(saved) : {
      daily: { target: 1, active: true },
      weekly: { target: 3, active: true },
      monthly: { target: 10, active: true }
    };
  });

  const [riskSettings, setRiskSettings] = useState<RiskSettings>(() => {
    const saved = localStorage.getItem('vyuha_risk');
    return saved ? JSON.parse(saved) : {
      maxRiskPerTrade: 1,
      maxTradesDay: 5,
      maxTradesWeek: 15,
      dailyDD: 3,
      weeklyDD: 6,
      monthlyDD: 10
    };
  });

  const [focusTasks, setFocusTasks] = useState<FocusTask[]>(() => {
    const saved = localStorage.getItem('vyuha_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  // Derived Profile State (Defaults)
  const activeProfile: UserProfile = profile || {
    nickname: 'Trader', bio: '', primaryExchange: 'Binance', timezone: 'UTC',
    fees: { maker: 0.02, taker: 0.05, type: 'PERCENTAGE' }, preferences: { enableAnimations: true, includeImportPnl: false }
  };

  // --- Effects ---
  useEffect(() => {
    const font = activeProfile.preferences?.fontFamily || "'Inter', sans-serif";
    document.documentElement.style.setProperty('--app-font', font);
  }, [activeProfile.preferences?.fontFamily]);

  // Gamification: Generate Achievements & Update Progress
  useEffect(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    generateForMonth(currentMonth);
  }, [generateForMonth]);

  useEffect(() => {
    if (trades.length > 0) {
      updateProgress(trades, journalEntries);
    }
  }, [trades, journalEntries, updateProgress]);

  // Theme Injection from profile
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : '79 70 229';
  };

  useEffect(() => {
    if (activeProfile.theme) {
      const primaryHex = activeProfile.theme.primary;
      const secondaryHex = activeProfile.theme.secondary;
      const primaryRgb = hexToRgb(primaryHex);
      const secondaryRgb = hexToRgb(secondaryHex);

      const styleId = 'vyuha-dynamic-theme';
      let styleTag = document.getElementById(styleId);
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
      }
      styleTag.innerHTML = `
                 :root { --primary-rgb: ${primaryRgb}; --secondary-rgb: ${secondaryRgb}; }
                 .text-indigo-400, .text-indigo-500, .text-indigo-600 { color: ${primaryHex} !important; }
                 .bg-indigo-600, .bg-indigo-500 { background-color: ${primaryHex} !important; }
                 .text-emerald-400, .text-emerald-500 { color: ${secondaryHex} !important; }
                 .bg-emerald-500, .bg-emerald-600 { background-color: ${secondaryHex} !important; }
             `;
    }
  }, [activeProfile.theme]);

  // --- Calculations ---
  const { visibleTrades, visibleTransactions } = useMemo(() => {
    // Simplified filter for single account MVP or filter by activeAccountId if implemented in future
    return { visibleTrades: trades, visibleTransactions: transactions };
  }, [trades, transactions]);

  const portfolioBalance = useMemo(() => {
    const realizedPnL = visibleTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    // Add transaction amounts (deposits - withdrawals)
    const transactionTotal = visibleTransactions.reduce((acc, t) => {
      return acc + (t.type === 'DEPOSIT' ? t.amount : -t.amount);
    }, 0);
    return 10000 + realizedPnL + transactionTotal; // Base 10k + PnL + Transactions
  }, [visibleTrades, visibleTransactions]);

  const currentRank = useMemo(() => {
    const closed = visibleTrades.filter(t => t.status === TradeStatus.CLOSED);
    const wins = closed.filter(t => (t.pnl || 0) > 0);
    const totalLoss = Math.abs(closed.filter(t => (t.pnl || 0) < 0).reduce((a, t) => a + (t.pnl || 0), 0) || 1);
    const totalWin = wins.reduce((a, t) => a + (t.pnl || 0), 0);
    const pf = closed.length > 0 ? totalWin / totalLoss : 0;

    // Calculate Avg RR
    const rrSum = closed.reduce((acc, t) => acc + (t.riskReward || 0), 0);
    const avgRR = closed.length > 0 ? rrSum / closed.length : 0;

    // Use Payoff Ratio if Avg RR is 0 (Fix for imported trades)
    let finalRR = avgRR;
    if (finalRR === 0 && closed.length > 0) {
      const avgWin = wins.length > 0 ? totalWin / wins.length : 0;
      const losses = closed.filter(t => (t.pnl || 0) < 0);
      const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, t) => a + (t.pnl || 0), 0) / losses.length) : 1;
      finalRR = avgLoss > 0 ? avgWin / avgLoss : 0;
    }

    return getTraderLevel(pf, 0, finalRR, closed.length);
  }, [visibleTrades]);

  const handleAddTrade = async (trade: Trade) => {
    await addTrade(trade);
    setShowTradeForm(false);
  };

  const handleCloseTrade = async (tradeId: string, exitPrice: number, exitDate: string, extraData?: Partial<Trade>) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;
    const qty = trade.quantity;
    let pnl = 0;
    if (trade.side === TradeSide.LONG) pnl = (exitPrice - trade.entryPrice) * qty;
    else pnl = (trade.entryPrice - exitPrice) * qty;

    await updateTrade({
      ...trade,
      status: TradeStatus.CLOSED,
      exitPrice, exitDate, pnl,
      pnlPercentage: (pnl / trade.capital) * 100,
      ...extraData
    });
  };

  // Wrapper for Account Update
  const handleUpdateAccount = (account: Account) => {
    updateAccount(account.id, account);
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-300 selection:bg-indigo-500/30">
      <Navbar
        activeView={activeView}
        onViewChange={setActiveView}
        userProfile={activeProfile}
        rank={currentRank}
        tradeStats={{ current: trades.filter(t => t.status === 'CLOSED').length, nextTarget: 100 }}
      />

      <main className="p-4 md:p-6 pb-24">
        {activeView === 'dashboard' && (
          <Dashboard
            trades={visibleTrades}
            strategies={strategies}
            availableTags={availableTags}
            onAddClick={() => setShowTradeForm(true)}
            onCloseTrade={handleCloseTrade}
            onViewChange={setActiveView}
            onNavigateToPlaybook={(tab) => { setActiveView('playbook'); setPlaybookTab(tab); }}
            baseCurrency={'USD'}
            profitGoals={profitGoals}
            riskSettings={riskSettings}
            portfolioBalance={portfolioBalance}
            habits={habits}
            habitCompletions={completions}
            onToggleHabit={toggleHabit}
            focusTasks={focusTasks}
            onAddFocusTask={(task) => setFocusTasks([...focusTasks, task])}
            onToggleFocusTask={(id) => { }}
            onDeleteFocusTask={(id) => { }}
            userFees={activeProfile.fees}
            nickname={activeProfile.nickname}
            enableAnimations={activeProfile.preferences?.enableAnimations ?? true}
            rank={currentRank}
            userProfile={activeProfile}
          />
        )}

        {/* PROFILE VIEW */}
        {activeView === 'profile' && (
          <Profile
            trades={visibleTrades}
            userProfile={activeProfile}
            onUpdateProfile={updateProfile}
            habitCompletions={completions}
            exchanges={['Binance', 'Bybit', 'Coinbase']}
          />
        )}

        {activeView === 'playbook' && (
          <Playbook
            strategies={strategies}
            onSaveStrategies={(newStrats: Strategy[]) => { /* Logic to handle bulk save or map to individual adds/updates */ }}
            tags={availableTags}
            onTagsChange={setAvailableTags}
            profitGoals={profitGoals}
            onUpdateGoals={setProfitGoals}
            riskSettings={riskSettings}
            onUpdateRisk={setRiskSettings}
            activeTab={playbookTab}
            onTabChange={setPlaybookTab}
          />
        )}

        {activeView === 'journal' && (
          <Journal
            trades={visibleTrades}
            entries={journalEntries}
            onSaveEntry={addEntry}
            onViewAnalytics={(date) => setActiveView('analytics')}
          />
        )}

        {activeView === 'habit-tracker' && (
          <HabitTracker
            habits={habits}
            setHabits={() => { }} // handled by hook
            completions={completions}
            setCompletions={() => { }} // handled by hook
          />
        )}

        {activeView === 'analytics' && (
          <Analytics
            trades={trades}
            strategies={strategies}
            filter={analyticsFilter}
            onFilterChange={setAnalyticsFilter}
            baseCurrency='USD'
          />
        )}

        {activeView === 'portfolio' && (
          <Portfolio
            accounts={accounts}
            transactions={transactions}
            trades={trades}
            onAddAccount={addAccount}
            onUpdateAccount={handleUpdateAccount}
            onDeleteAccount={deleteAccount}
            onAddTransaction={addTransaction}
            onDeleteTransaction={deleteTransaction}
            activeAccountId={activeAccountId}
            onSelectAccount={setActiveAccountId}
            baseCurrency='USD'
          />
        )}

        {activeView === 'achievements' && (
          <Achievements
            achievements={achievements}
          />
        )}

        {/* DATA LAB VIEW */}
        {activeView === 'data-lab' && (
          <DataLab
            trades={trades}
            onSeekWisdom={(data) => {
              console.log("Seeking Wisdom", data);
              setActiveView('guru-ji');
            }}
            onDeleteTrade={deleteTrade}
          />
        )}

        {activeView === 'guru-ji' && (
          <Guruji
            trades={trades}
            strategies={strategies}
            userProfile={{ name: activeProfile.nickname, balance: portfolioBalance }}
            profitGoals={profitGoals}
            riskSettings={riskSettings}
            achievements={achievements}
          />
        )}

        {activeView === 'settings' && (
          <Settings
            userProfile={activeProfile}
            onUpdateProfile={updateProfile}
            trades={trades}
            onImportTrades={importTrades}
            onClearTrades={() => {
              if (confirm('Are you sure you want to delete ALL trades? This cannot be undone.')) {
                clearAllTrades();
                toast.show('All trades cleared successfully.', 'error');
              }
            }}
            onClearImportedTrades={() => {
              if (confirm('Are you sure you want to delete all IMPORTED trades?')) {
                clearImportedTrades();
                toast.show('Imported trades cleared successfully.', 'success');
              }
            }}
          />
        )}
      </main>

      {showTradeForm && (
        <TradeForm
          onClose={() => setShowTradeForm(false)}
          onSave={handleAddTrade}
          strategies={strategies}
          availableTags={availableTags}
          onAddGlobalTag={(cat, name) => { }} // Implement
          portfolioBalance={portfolioBalance}
          userFees={activeProfile.fees}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0E14] text-indigo-500">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl"></i>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return <AppContent />;
};

export default App;
