
import React, { useState, useMemo } from 'react';
import { Trade, Transaction, Account, getCurrencyFormatter, TradeStatus } from '../types';
import { ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

interface PortfolioProps {
    trades: Trade[];
    transactions: Transaction[];
    onAddTransaction: (transaction: Transaction) => void;
    accounts: Account[];
    onAddAccount: (account: Account) => void;
    onUpdateAccount: (account: Account) => void;
    baseCurrency: string;
    activeAccountId: string;
    onSelectAccount: (id: string) => void;
    onDeleteAccount?: (id: string) => void;
    onDeleteTransaction?: (id: string) => void;
}

const Portfolio: React.FC<PortfolioProps> = ({
    trades,
    transactions,
    onAddTransaction,
    accounts,
    onAddAccount,
    onUpdateAccount,
    baseCurrency,
    activeAccountId,
    onSelectAccount
}) => {
    // Local state for activeAccountId removed, using prop
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [showDepositHistory, setShowDepositHistory] = useState(false);
    const [showWithdrawHistory, setShowWithdrawHistory] = useState(false);

    // Account Management Modal
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [newAccountName, setNewAccountName] = useState('');
    const [isExclusive, setIsExclusive] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);

    // --- Handlers ---
    const handleSaveAccount = () => {
        if (!newAccountName.trim()) return;

        if (editingAccount) {
            onUpdateAccount({ ...editingAccount, name: newAccountName, isExclusive });
        } else {
            onAddAccount({
                id: Date.now().toString(),
                name: newAccountName,
                currency: 'USD',
                icon: 'fa-wallet',
                color: 'text-indigo-400',
                isExclusive
            });
        }
        setShowAccountModal(false);
        setNewAccountName('');
        setIsExclusive(false);
        setEditingAccount(null);
    };

    const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];

    // Handle initial empty state
    if (!activeAccount) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500 pb-12 flex flex-col items-center justify-center h-[50vh]">
                <div className="h-16 w-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                    <i className="fa-solid fa-wallet text-3xl text-slate-500"></i>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">No Accounts Found</h2>
                <p className="text-slate-500 text-sm mb-6 text-center max-w-md">
                    Create your first trading account to start tracking your simulated portfolio.
                </p>
                <button
                    onClick={() => {
                        setEditingAccount(null);
                        setNewAccountName('Main Account');
                        setIsExclusive(false);
                        setShowAccountModal(true);
                    }}
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                    <i className="fa-solid fa-plus mr-2"></i> Create Main Account
                </button>

                {/* Account Modal for Creation */}
                {showAccountModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-sm bg-[#0B0E14] rounded-2xl border border-slate-800 shadow-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Create First Account</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Account Name</label>
                                    <input
                                        type="text"
                                        value={newAccountName}
                                        onChange={(e) => setNewAccountName(e.target.value)}
                                        className="w-full bg-[#151A25] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                                        placeholder="e.g. Main Account"
                                    />
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button
                                        onClick={handleSaveAccount}
                                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500"
                                    >
                                        Create Account
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
    const currency = getCurrencyFormatter(baseCurrency);

    // Filter data for active account
    const accountTrades = trades.filter(t => t.accountId === activeAccount?.id);
    const accountTransactions = transactions.filter(t => t.accountId === activeAccount?.id);

    // Derived Balance
    const currentBalance = useMemo(() => {
        const totalDeposits = accountTransactions.filter(t => t.type === 'DEPOSIT').reduce((acc, t) => acc + t.amount, 0);
        const totalWithdrawals = accountTransactions.filter(t => t.type === 'WITHDRAWAL').reduce((acc, t) => acc + t.amount, 0);
        const totalRealizedPnL = accountTrades.filter(t => t.status === TradeStatus.CLOSED).reduce((acc, t) => acc + (t.pnl || 0), 0);
        return totalDeposits - totalWithdrawals + totalRealizedPnL;
    }, [accountTransactions, accountTrades]);

    const handleDeposit = () => {
        const amount = parseFloat(depositAmount);
        if (isNaN(amount) || amount <= 0) return;

        const usdAmount = amount / currency.convert(1); // Convert back to USD

        const newTransaction: Transaction = {
            id: Date.now().toString(),
            type: 'DEPOSIT',
            amount: usdAmount,
            date: new Date().toISOString(),
            note: 'Manual Deposit',
            accountId: activeAccount?.id || activeAccountId // Fallback to prop if account missing but should use activeAccount.id
        };
        onAddTransaction(newTransaction);
        setDepositAmount('');
    };

    const handleWithdraw = () => {
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) return;

        const usdAmount = amount / currency.convert(1); // Convert back to USD

        if (usdAmount > currentBalance) {
            alert('Insufficient funds');
            return;
        }

        const newTransaction: Transaction = {
            id: Date.now().toString(),
            type: 'WITHDRAWAL',
            amount: usdAmount,
            date: new Date().toISOString(),
            note: 'Manual Withdrawal',
            accountId: activeAccount?.id || activeAccountId
        };
        onAddTransaction(newTransaction);
        setWithdrawAmount('');
    };

    // Mock Equity Data
    const equityData = [
        { date: 'Jan', value: currentBalance * 0.85 },
        { date: 'Feb', value: currentBalance * 0.88 },
        { date: 'Mar', value: currentBalance * 0.86 },
        { date: 'Apr', value: currentBalance * 0.92 },
        { date: 'May', value: currentBalance * 0.95 },
        { date: 'Jun', value: currentBalance * 0.94 },
        { date: 'Jul', value: currentBalance },
    ].map((d: { date: string, value: number }) => ({ ...d, value: currency.convert(d.value) })); // Convert for display

    const depositHistory = accountTransactions.filter(t => t.type === 'DEPOSIT').sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const withdrawHistory = accountTransactions.filter(t => t.type === 'WITHDRAWAL').sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        <i className="fa-solid fa-wallet text-emerald-500"></i>
                    </div>
                    <h1 className="text-3xl font-bold text-white">My Portfolio</h1>
                </div>
            </div>

            {/* Account Selector */}
            <div className="flex items-center gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {accounts.map(acc => (
                    <div
                        key={acc.id}
                        onClick={() => onSelectAccount(acc.id)}
                        className={`relative group min-w-[200px] p-4 rounded-xl border cursor-pointer transition-all ${acc.isExclusive
                            ? (activeAccountId === acc.id
                                ? 'bg-[#2A1C10] border-amber-500/50 shadow-lg shadow-amber-500/10'
                                : 'bg-[#1C1510] border-amber-900/40 hover:border-amber-700/50')
                            : (activeAccountId === acc.id
                                ? 'bg-[#1E2330] border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                                : 'bg-[#151A25] border-slate-800 hover:border-slate-700')
                            }`}
                    >
                        {acc.isExclusive && (
                            <div className="absolute top-2 right-2 text-amber-500" title="Exclusive Account">
                                <i className="fa-solid fa-crown text-xs drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]"></i>
                            </div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                            <div className={`h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center ${acc.color}`}>
                                <i className={`fa-solid ${acc.icon}`}></i>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingAccount(acc);
                                    setNewAccountName(acc.name);
                                    setIsExclusive(acc.isExclusive || false);
                                    setShowAccountModal(true);
                                }}
                                className="text-slate-600 hover:text-white transition-colors"
                            >
                                <i className="fa-solid fa-ellipsis"></i>
                            </button>
                        </div>
                        <p className="text-sm font-bold text-white truncate">{acc.name}</p>
                        <p className="text-xs text-slate-500">
                            {activeAccountId === acc.id ? 'Active' : 'Switch'}
                        </p>
                    </div>
                ))}

                <button
                    onClick={() => {
                        setEditingAccount(null);
                        setNewAccountName('');
                        setIsExclusive(false);
                        setShowAccountModal(true);
                    }}
                    className="min-w-[60px] flex items-center justify-center rounded-xl border border-dashed border-slate-700 bg-[#0B0E14] text-slate-500 hover:text-white hover:border-slate-500 transition-colors"
                >
                    <i className="fa-solid fa-plus text-xl"></i>
                </button>
            </div>

            {/* Main Balance Card */}
            <div className="rounded-2xl border border-slate-800 bg-[#151A25] p-8">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-scale-balanced"></i> {activeAccount.name} Balance
                </p>
                <p className="text-5xl font-bold text-emerald-400 font-mono tracking-tight">
                    {currency.format(currentBalance)}
                </p>
                <p className="text-sm text-slate-500 mt-2">Available funds for simulated trading</p>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Deposit Section */}
                <div className="rounded-2xl border border-slate-800 bg-[#151A25] p-6 flex flex-col h-full">
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-1">
                            <i className="fa-solid fa-building-columns text-indigo-400"></i>
                            <h3 className="text-lg font-bold text-white">Deposit Funds</h3>
                        </div>
                        <p className="text-xs text-slate-400">Deposit money to your account for simulated trading.</p>
                    </div>

                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Amount ({baseCurrency})</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency.symbol}</span>
                                <input
                                    type="number"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg py-3 pl-8 pr-4 text-white focus:border-indigo-500 focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleDeposit}
                            disabled={!depositAmount}
                            className="w-fit px-6 py-2.5 rounded-lg bg-[#8B5CF6] text-white text-sm font-bold shadow-lg hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Deposit Funds
                        </button>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800">
                        <button
                            onClick={() => setShowDepositHistory(!showDepositHistory)}
                            className="flex items-center justify-center w-full gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                        >
                            <i className="fa-solid fa-clock-rotate-left"></i> View Deposit History <i className={`fa-solid fa-chevron-down transition-transform ${showDepositHistory ? 'rotate-180' : ''}`}></i>
                        </button>

                        {showDepositHistory && (
                            <div className="mt-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                {depositHistory.length > 0 ? depositHistory.map(t => (
                                    <div key={t.id} className="flex justify-between items-center bg-[#0B0E14] p-3 rounded border border-slate-800/50">
                                        <div>
                                            <p className="text-xs font-bold text-white">{currency.format(t.amount)}</p>
                                            <p className="text-[10px] text-slate-500">{new Date(t.date).toLocaleDateString()}</p>
                                        </div>
                                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">COMPLETED</span>
                                    </div>
                                )) : (
                                    <p className="text-center text-xs text-slate-600 py-2">No deposits yet.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Withdraw Section */}
                <div className="rounded-2xl border border-slate-800 bg-[#151A25] p-6 flex flex-col h-full">
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-1">
                            <i className="fa-solid fa-money-bill-transfer text-rose-400"></i>
                            <h3 className="text-lg font-bold text-white">Withdraw Funds</h3>
                        </div>
                        <p className="text-xs text-slate-400">Withdraw money from your account.</p>
                    </div>

                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Amount ({baseCurrency})</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency.symbol}</span>
                                <input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg py-3 pl-8 pr-4 text-white focus:border-rose-500 focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleWithdraw}
                            disabled={!withdrawAmount}
                            className="w-fit px-6 py-2.5 rounded-lg bg-rose-900/50 border border-rose-500/50 text-rose-200 text-sm font-bold shadow-lg hover:bg-rose-900 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Withdraw Funds
                        </button>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800">
                        <button
                            onClick={() => setShowWithdrawHistory(!showWithdrawHistory)}
                            className="flex items-center justify-center w-full gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                        >
                            <i className="fa-solid fa-clock-rotate-left"></i> View Withdrawal History <i className={`fa-solid fa-chevron-down transition-transform ${showWithdrawHistory ? 'rotate-180' : ''}`}></i>
                        </button>

                        {showWithdrawHistory && (
                            <div className="mt-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                {withdrawHistory.length > 0 ? withdrawHistory.map(t => (
                                    <div key={t.id} className="flex justify-between items-center bg-[#0B0E14] p-3 rounded border border-slate-800/50">
                                        <div>
                                            <p className="text-xs font-bold text-white">-{currency.format(t.amount)}</p>
                                            <p className="text-[10px] text-slate-500">{new Date(t.date).toLocaleDateString()}</p>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-700/30 px-2 py-1 rounded">PROCESSED</span>
                                    </div>
                                )) : (
                                    <p className="text-center text-xs text-slate-600 py-2">No withdrawals yet.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Equity Curve Preview */}
            <div className="rounded-2xl border border-slate-800 bg-[#151A25] p-6 hidden md:block">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Account Growth</h3>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={equityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val: number) => `${currency.symbol}${val / 1000}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                itemStyle={{ color: '#10b981' }}
                                formatter={(value: number) => [`${currency.format(value)}`, 'Balance']}
                            />
                            <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEquity)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Account Modal */}
            {showAccountModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-[#0B0E14] rounded-2xl border border-slate-800 shadow-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">{editingAccount ? 'Edit Account' : 'New Account'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Account Name</label>
                                <input
                                    type="text"
                                    value={newAccountName}
                                    onChange={(e) => setNewAccountName(e.target.value)}
                                    className="w-full bg-[#151A25] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                                    placeholder="e.g. Scalping Account"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isExclusive"
                                    checked={isExclusive}
                                    onChange={(e) => setIsExclusive(e.target.checked)}
                                    className="accent-indigo-500 h-4 w-4"
                                />
                                <label htmlFor="isExclusive" className="text-xs text-slate-400 cursor-pointer select-none">
                                    <span className="font-bold text-white">Exclusive Account</span>
                                    <span className="block text-[10px] text-slate-500">Hide trades from global analytics & other accounts</span>
                                </label>
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    onClick={() => setShowAccountModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveAccount}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Portfolio;
