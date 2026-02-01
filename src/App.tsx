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
import { UndoProvider, useUndo } from './contexts/UndoContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useTrades } from './hooks/useTrades';
import { useProfile } from './hooks/useProfile';
import { useStrategies } from './hooks/useStrategies';
import { useHabits } from './hooks/useHabits';
import { useJournals } from './hooks/useJournals';
import { useAccounts } from './hooks/useAccounts';
import { useTransactions } from './hooks/useTransactions';
import { useAchievements } from './hooks/useAchievements';
import { Trade, View, UserProfile, Tag, ProfitGoals, RiskSettings, FocusTask, Transaction, Account, TradeStatus, TradeSide, DateFilterState, Strategy, TAG_COLORS } from './types';

// --- Trader Levels ---
const TRADER_LEVELS = [
  { name: 'Novice', minPF: 0, maxDD: 100, minRR: 0, minTrades: 0, color: 'text-slate-500', shadow: 'shadow-slate-500/50', desc: 'Survival & Edge Repair' },
  { name: 'Survivor', minPF: 1.2, maxDD: 25, minRR: 0.1, minTrades: 2, color: 'text-cyan-400', shadow: 'shadow-cyan-400/50', desc: 'Basic Consistency' },
  { name: 'Consistent', minPF: 1.5, maxDD: 20, minRR: 0.25, minTrades: 5, color: 'text-emerald-400', shadow: 'shadow-emerald-400/50', desc: 'Sustainable Edge' },
  { name: 'Warrior', minPF: 2.0, maxDD: 15, minRR: 0.45, minTrades: 10, color: 'text-amber-400', shadow: 'shadow-amber-400/50', desc: 'High-Quality Asymmetry' },
  { name: 'Elite', minPF: 2.8, maxDD: 12, minRR: 0.8, minTrades: 20, color: 'text-rose-400', shadow: 'shadow-rose-400/50', desc: 'Rare Excellence' },
  { name: 'GOD', minPF: 4.0, maxDD: 10, minRR: 1.4, minTrades: 50, color: 'text-purple-400', shadow: 'shadow-purple-500/80', desc: 'Unicorn Status' },
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
  const { trades, addTrade, updateTrade, deleteTrade, deleteTrades, importTrades, clearAllTrades, clearImportedTrades } = useTrades();
  const { profile, updateProfile } = useProfile();
  const { strategies, addStrategy, updateStrategy, deleteStrategy } = useStrategies();
  const { habits, completions, toggleHabit, addHabit, deleteHabit } = useHabits();

  const { entries: journalEntries, addEntry } = useJournals();
  const { accounts, addAccount, updateAccount, deleteAccount } = useAccounts();
  const { transactions, addTransaction, deleteTransaction } = useTransactions();
  const { achievements, generateForMonth, updateProgress } = useAchievements();
  const { showUndo, confirmDelete } = useUndo();

  // Local State (UI only)
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string>('main');
  const [playbookTab, setPlaybookTab] = useState('strategies');
  const [gurujiContext, setGurujiContext] = useState<any>(null);

  const [analyticsFilter, setAnalyticsFilter] = useState<DateFilterState>({ type: 'LIFETIME' });

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

  // --- Persistence Effects ---
  useEffect(() => {
    localStorage.setItem('vyuha_tags', JSON.stringify(availableTags));
  }, [availableTags]);

  useEffect(() => {
    localStorage.setItem('vyuha_goals', JSON.stringify(profitGoals));
  }, [profitGoals]);

  useEffect(() => {
    localStorage.setItem('vyuha_risk', JSON.stringify(riskSettings));
  }, [riskSettings]);

  useEffect(() => {
    localStorage.setItem('vyuha_tasks', JSON.stringify(focusTasks));
  }, [focusTasks]);

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
  const activeAccount = useMemo(() => accounts.find(a => a.id === activeAccountId) || accounts[0], [accounts, activeAccountId]);

  const { visibleTrades, visibleTransactions } = useMemo(() => {
    // If we have an active account, filter by it. Otherwise show all.
    const tradesToFilter = activeAccount ? trades.filter(t => t.accountId === activeAccount.id) : trades;
    const transactionsToFilter = activeAccount ? transactions.filter(t => t.accountId === activeAccount.id) : transactions;
    return { visibleTrades: tradesToFilter, visibleTransactions: transactionsToFilter };
  }, [trades, transactions, activeAccount]);

  const portfolioBalance = useMemo(() => {
    const totalDeposits = visibleTransactions.filter(t => t.type === 'DEPOSIT').reduce((acc, t) => acc + t.amount, 0);
    const totalWithdrawals = visibleTransactions.filter(t => t.type === 'WITHDRAWAL').reduce((acc, t) => acc + t.amount, 0);
    const totalRealizedPnL = visibleTrades.filter(t => t.status === TradeStatus.CLOSED).reduce((acc, t) => acc + (t.pnl || 0), 0);
    return totalDeposits - totalWithdrawals + totalRealizedPnL;
  }, [visibleTransactions, visibleTrades]);

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
    await addTrade({
      ...trade,
      accountId: activeAccountId,
      exchange: activeAccount?.exchange || 'Manual'
    });
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

  // --- Task Handlers ---
  const handleToggleFocusTask = (id: string) => {
    setFocusTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteFocusTask = (id: string) => {
    setFocusTasks(prev => prev.filter(t => t.id !== id));
  };

  // --- Global Tag Handler ---
  const handleAddGlobalTag = (category: string, name: string) => {
    setAvailableTags(prev => {
      const existing = prev[category] || [];
      if (existing.some(t => t.name === name)) return prev;

      // Auto-assign color based on category
      let color = 'slate';
      if (category === 'entry') color = 'purple';
      if (category === 'exit') color = 'rose';
      if (category === 'mental') color = 'amber';
      if (category === 'general') color = 'blue';

      const newTag: Tag = {
        id: Date.now().toString(),
        name,
        color,
        category
      };

      return { ...prev, [category]: [...existing, newTag] };
    });
  };

  const handleToggleFavoriteSymbol = (symbol: string) => {
    const currentFavs = activeProfile.favoriteSymbols || [];
    const isFav = currentFavs.includes(symbol);
    const newFavs = isFav
      ? currentFavs.filter(s => s !== symbol)
      : [...currentFavs, symbol];

    updateProfile({ favoriteSymbols: newFavs });
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-300 selection:bg-indigo-500/30">
      <Navbar
        activeView={activeView}
        onViewChange={(view) => { setActiveView(view); if (view !== 'guru-ji') setGurujiContext(null); }}
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
            onToggleFocusTask={handleToggleFocusTask}
            onDeleteFocusTask={handleDeleteFocusTask}
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
            rank={currentRank}
          />
        )}

        {activeView === 'playbook' && (
          <Playbook
            strategies={strategies}
            trades={trades}
            onSaveStrategies={async (newStrats: Strategy[]) => {
              // Only handle additions and updates (Deletions are handled by onDeleteStrategy)
              for (const s of newStrats) {
                const existing = strategies.find(old => old.id === s.id);
                if (!existing) {
                  // This is a new strategy
                  await addStrategy(s);
                } else {
                  // This is an update
                  await updateStrategy(s.id, s);
                }
              }
            }}
            onDeleteStrategy={deleteStrategy}
            onRestoreStrategy={addStrategy}
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
            onViewAnalytics={(date) => {
              // Future: Pass date filter to analytics
              setAnalyticsFilter({ type: 'ABSOLUTE', range: { start: date, end: date } });
              setActiveView('analytics');
            }}
          />
        )}

        {activeView === 'habit-tracker' && (
          <HabitTracker
            habits={habits}
            completions={completions}
            onToggleHabit={toggleHabit}
            onAddHabit={addHabit}
            onDeleteHabit={deleteHabit}
          />
        )}

        {activeView === 'analytics' && (
          <Analytics
            trades={trades}
            strategies={strategies}
            tags={availableTags}
            filter={analyticsFilter}
            onFilterChange={setAnalyticsFilter}
            baseCurrency='USD'
            onDeleteTrades={deleteTrades}
            onRestoreTrades={importTrades}
            onImportTrades={importTrades} // Added missing prop
            onSeekWisdom={(data) => {
              setGurujiContext(data);
              setActiveView('guru-ji');
            }}
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
            availableExchanges={[...(activeProfile.exchanges || [])]}
            onAddExchange={(name: string) => updateProfile({ exchanges: [...(activeProfile.exchanges || []), name] })}
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
              setGurujiContext(data);
              setActiveView('guru-ji');
            }}
            onDeleteTrade={deleteTrade}
            onRestoreTrade={addTrade} // Added for undo support
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
            habits={habits}
            completions={completions}
            initialContext={gurujiContext}
            onAddStrategy={addStrategy}
            onAddHabit={addHabit}
            onAddTag={handleAddGlobalTag}
          />
        )}

        {activeView === 'settings' && (
          <Settings
            userProfile={activeProfile}
            onUpdateProfile={updateProfile}
            trades={trades}
            onImportTrades={importTrades}
            setActiveView={setActiveView}
            onClearTrades={() => {
              confirmDelete('Are you sure you want to delete ALL trades? This cannot be undone.', () => {
                const tradesToRestore = [...trades];
                clearAllTrades();
                showUndo(`${tradesToRestore.length} trades deleted.`, () => {
                  importTrades(tradesToRestore);
                });
                toast.show('All trades cleared successfully.', 'error');
              });
            }}
            onClearImportedTrades={() => {
              confirmDelete('Are you sure you want to delete all IMPORTED trades?', () => {
                const importedTrades = trades.filter(t => t.tradeType === 'PAST');
                clearImportedTrades();
                showUndo(`${importedTrades.length} imported trades deleted.`, () => {
                  importTrades(importedTrades);
                });
              });
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
          onAddGlobalTag={handleAddGlobalTag}
          portfolioBalance={portfolioBalance}
          userFees={activeAccount?.fees || activeProfile.fees}
          slPresets={activeAccount?.favoriteSymbols?.length ? activeProfile.slPresets : activeProfile.slPresets} // Placeholder if we want account specifics later
          tpPresets={activeProfile.tpPresets}
          leveragePresets={activeProfile.leveragePresets}
          riskPresets={activeProfile.riskPresets}
          favoriteSymbols={activeProfile.favoriteSymbols || []}
          onToggleFavoriteSymbol={handleToggleFavoriteSymbol}
          availableExchanges={[...(activeProfile.exchanges || [])]}
          defaultExchange={activeAccount?.exchange || activeProfile.primaryExchange || 'Binance'}
          onAddExchange={(name: string) => updateProfile({ exchanges: [...(activeProfile.exchanges || []), name] })}
          onJumpToPortfolio={() => {
            setActiveView('portfolio');
            setShowTradeForm(false);
          }}
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

  return (
    <UndoProvider>
      <AppContent />
    </UndoProvider>
  );
};

export default App;
