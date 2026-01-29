
import React, { useState, useMemo, useEffect } from 'react';
import { useUndo } from '../contexts/UndoContext';
import { Strategy, Trade, Tag, TAG_COLORS, ProfitGoals, RiskSettings } from '../types';

interface PlaybookProps {
    strategies: Strategy[];
    trades: Trade[];
    onSaveStrategies: (strategies: Strategy[]) => void;
    onDeleteStrategy: (id: string) => void;
    onRestoreStrategy: (strategy: Strategy) => void;
    tags: Record<string, Tag[]>;
    onTagsChange: React.Dispatch<React.SetStateAction<Record<string, Tag[]>>>;
    profitGoals: ProfitGoals;
    onUpdateGoals: (goals: ProfitGoals) => void;
    riskSettings: RiskSettings;
    onUpdateRisk: (risk: RiskSettings) => void;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const Playbook: React.FC<PlaybookProps> = ({
    strategies, trades, onSaveStrategies, onDeleteStrategy, onRestoreStrategy,
    tags: tagList, onTagsChange: setTagList,
    profitGoals: savedProfitGoals, onUpdateGoals,
    riskSettings: savedRiskSettings, onUpdateRisk,
    activeTab, onTabChange
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStrategyId, setEditingStrategyId] = useState<string | null>(null);

    // --- Tag Customization State ---
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [editingTagCategory, setEditingTagCategory] = useState<string>('');

    const { showUndo, confirmDelete } = useUndo();

    // --- New Strategy Form State ---

    // --- New Strategy Form State ---
    const initialFormState = {
        name: '',
        description: '',
        version: 1,
        entryPrimary: [] as string[],
        entrySecondary: [] as string[],
        exitPrimary: [] as string[],
        exitSecondary: [] as string[],
        setups: [] as string[],
        sizingRules: [] as string[],
        riskParams: {
            maxRiskPerTrade: '',
            minRR: '',
            dailyMaxDD: ''
        }
    };
    const [formData, setFormData] = useState(initialFormState);

    // Goals State (Form local)
    const [localGoals, setLocalGoals] = useState({
        daily: { target: (savedProfitGoals?.daily?.target || 0).toString(), active: savedProfitGoals?.daily?.active || false },
        weekly: { target: (savedProfitGoals?.weekly?.target || 0).toString(), active: savedProfitGoals?.weekly?.active || false },
        monthly: { target: (savedProfitGoals?.monthly?.target || 0).toString(), active: savedProfitGoals?.monthly?.active || false },
    });

    // Risk State (Form local)
    const [localRisk, setLocalRisk] = useState({
        dailyDD: (savedRiskSettings?.dailyDD || 0).toString(),
        weeklyDD: (savedRiskSettings?.weeklyDD || 0).toString(),
        monthlyDD: (savedRiskSettings?.monthlyDD || 0).toString(),
        maxTradesDay: (savedRiskSettings?.maxTradesDay || 0).toString(),
        maxTradesWeek: (savedRiskSettings?.maxTradesWeek || 15).toString(),
        maxRiskPerTrade: (savedRiskSettings?.maxRiskPerTrade || 1).toString(),
    });

    // Sync props to local state if they change externally (or on mount)
    useEffect(() => {
        if (!savedProfitGoals) return;
        setLocalGoals({
            daily: { target: (savedProfitGoals.daily?.target || 0).toString(), active: savedProfitGoals.daily?.active || false },
            weekly: { target: (savedProfitGoals.weekly?.target || 0).toString(), active: savedProfitGoals.weekly?.active || false },
            monthly: { target: (savedProfitGoals.monthly?.target || 0).toString(), active: savedProfitGoals.monthly?.active || false },
        });
    }, [savedProfitGoals]);

    useEffect(() => {
        if (!savedRiskSettings) return;
        setLocalRisk({
            dailyDD: (savedRiskSettings.dailyDD || 0).toString(),
            weeklyDD: (savedRiskSettings.weeklyDD || 0).toString(),
            monthlyDD: (savedRiskSettings.monthlyDD || 0).toString(),
            maxTradesDay: (savedRiskSettings.maxTradesDay || 0).toString(),
            maxTradesWeek: (savedRiskSettings.maxTradesWeek || 15).toString(),
            maxRiskPerTrade: (savedRiskSettings.maxRiskPerTrade || 1).toString(),
        });
    }, [savedRiskSettings]);

    // Cleanup timer on unmount


    // --- Handlers ---
    const handleEditStrategy = (strategy: Strategy) => {
        setEditingStrategyId(strategy.id);
        setFormData({
            name: strategy.name,
            description: strategy.description,
            version: strategy.version || 1,
            entryPrimary: strategy.entryRules.primary,
            entrySecondary: strategy.entryRules.secondary,
            exitPrimary: strategy.exitRules.primary,
            exitSecondary: strategy.exitRules.secondary,
            setups: strategy.setups,
            sizingRules: strategy.sizingRules,
            riskParams: {
                maxRiskPerTrade: strategy.riskParams.maxRiskPerTrade?.toString() || '',
                minRR: strategy.riskParams.minRR?.toString() || '',
                dailyMaxDD: strategy.riskParams.dailyMaxDD?.toString() || '',
            }
        });
        setIsModalOpen(true);
    };

    const saveStrategyLogic = (isNewVersion: boolean) => {
        if (!formData.name) return; // Simple validation

        const baseData = {
            name: formData.name,
            description: formData.description,
            setups: formData.setups,
            sizingRules: formData.sizingRules,
            riskParams: {
                maxRiskPerTrade: parseFloat(formData.riskParams.maxRiskPerTrade) || 0,
                minRR: parseFloat(formData.riskParams.minRR) || 0,
                dailyMaxDD: parseFloat(formData.riskParams.dailyMaxDD) || 0,
            },
            entryRules: {
                primary: formData.entryPrimary,
                secondary: formData.entrySecondary
            },
            exitRules: {
                primary: formData.exitPrimary,
                secondary: formData.exitSecondary
            }
        };

        if (editingStrategyId && !isNewVersion) {
            // Update existing strategy in-place
            const updatedStrategies = strategies.map(s => {
                if (s.id === editingStrategyId) {
                    return { ...s, ...baseData, version: formData.version };
                }
                return s;
            });
            onSaveStrategies(updatedStrategies);
        } else {
            // Create new strategy OR save as new version
            const newVersion = isNewVersion ? formData.version + 1 : 1;

            const newStrategy: Strategy = {
                id: crypto.randomUUID(),
                version: newVersion,
                status: 'active',
                stats: {
                    totalTrades: 0,
                    winRate: 0,
                    profitFactor: 0,
                    netRoi: 0,
                    totalPnl: 0
                },
                ...baseData
            };
            onSaveStrategies([...strategies, newStrategy]);
        }

        setFormData(initialFormState);
        setEditingStrategyId(null);
        setIsModalOpen(false);
    };

    const handleSaveStrategy = () => saveStrategyLogic(false);
    const handleSaveAsNewVersion = () => saveStrategyLogic(true);

    const toggleStrategyStatus = (id: string) => {
        const updated = strategies.map(s => {
            if (s.id === id) {
                return { ...s, status: s.status === 'active' ? 'inactive' : 'active' } as Strategy;
            }
            return s;
        });
        onSaveStrategies(updated);
    };

    const handleDeleteStrategy = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const strategyToDelete = strategies.find(s => s.id === id);
        if (!strategyToDelete) return;

        confirmDelete(
            `Are you sure you want to delete the strategy "${strategyToDelete.name}"?`,
            () => {
                // Remove immediate
                onDeleteStrategy(id);

                // Show Undo
                showUndo(
                    `Strategy "${strategyToDelete.name}" deleted.`,
                    () => {
                        onRestoreStrategy(strategyToDelete);
                    }
                );
            }
        );
    };

    // --- Handlers for Goals & Risk Save ---
    const handleSaveGoals = () => {
        const updatedGoals: ProfitGoals = {
            daily: { target: parseFloat(localGoals.daily.target) || 0, active: localGoals.daily.active },
            weekly: { target: parseFloat(localGoals.weekly.target) || 0, active: localGoals.weekly.active },
            monthly: { target: parseFloat(localGoals.monthly.target) || 0, active: localGoals.monthly.active },
        };
        onUpdateGoals(updatedGoals);
    };

    const handleSaveRisk = () => {
        const updatedRisk: RiskSettings = {
            dailyDD: parseFloat(localRisk.dailyDD) || 0,
            weeklyDD: parseFloat(localRisk.weeklyDD) || 0,
            monthlyDD: parseFloat(localRisk.monthlyDD) || 0,
            maxTradesDay: parseFloat(localRisk.maxTradesDay) || 0,
            maxTradesWeek: parseFloat(localRisk.maxTradesWeek) || 0,
            maxRiskPerTrade: parseFloat(localRisk.maxRiskPerTrade) || 0,
        };
        onUpdateRisk(updatedRisk);
    };

    // Tags State
    const [activeTagCategory, setActiveTagCategory] = useState('entry');
    const [newTagValue, setNewTagValue] = useState('');

    const handleAddTag = () => {
        if (!newTagValue.trim()) return;
        const newTag: Tag = {
            id: Date.now().toString(),
            name: newTagValue,
            color: 'purple',
            category: activeTagCategory,
            isBold: false,
            hasGlow: false
        };
        setTagList({
            ...tagList,
            [activeTagCategory]: [...(tagList[activeTagCategory] || []), newTag]
        });
        setNewTagValue('');
    };

    const handleDeleteTag = (id: string) => {
        const tagToDelete = (tagList[activeTagCategory] || []).find(t => t.id === id);
        if (!tagToDelete) return;

        confirmDelete(`Delete tag "${tagToDelete.name}"?`, () => {
            setTagList(prev => ({
                ...prev,
                [activeTagCategory]: (prev[activeTagCategory] || []).filter(t => t.id !== id)
            }));

            showUndo(`Tag "${tagToDelete.name}" deleted`, () => {
                setTagList(prev => ({
                    ...prev,
                    [activeTagCategory]: [...(prev[activeTagCategory] || []), tagToDelete]
                }));
            });
        });
    };

    const handleEditTag = (tag: Tag, category: string) => {
        setEditingTag(tag);
        setEditingTagCategory(category);
        setIsTagModalOpen(true);
    };

    const handleSaveTag = () => {
        if (editingTag && editingTagCategory) {
            const updatedList = (tagList[editingTagCategory] || []).map(t =>
                t.id === editingTag.id ? editingTag : t
            );
            setTagList({
                ...tagList,
                [editingTagCategory]: updatedList
            });
            setIsTagModalOpen(false);
            setEditingTag(null);
        }
    };

    const tagCategories = [
        { id: 'entry', label: 'Entry Reasons', icon: 'fa-right-to-bracket' },
        { id: 'exit', label: 'Exit Reasons', icon: 'fa-right-from-bracket' },
        { id: 'mental', label: 'Mental States', icon: 'fa-brain' },
        { id: 'general', label: 'General Tags', icon: 'fa-cube' },
    ];

    // Group Strategies by Name AND Calculate Live Stats
    const groupedStrategies = useMemo(() => {
        const groups: Record<string, Strategy[]> = {};
        strategies.forEach(s => {
            // Calculate stats for this specific strategy version
            const strategyTrades = trades.filter(t => t.strategyId === s.id && t.status === 'CLOSED');
            const totalTrades = strategyTrades.length;
            const wins = strategyTrades.filter(t => (t.pnl || 0) > 0);
            const losses = strategyTrades.filter(t => (t.pnl || 0) < 0);

            const totalGrossProfit = wins.reduce((acc, t) => acc + (t.pnl || 0), 0);
            const totalGrossLoss = Math.abs(losses.reduce((acc, t) => acc + (t.pnl || 0), 0));
            const totalPnl = strategyTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

            const profitFactor = totalGrossLoss > 0 ? (totalGrossProfit / totalGrossLoss) : (totalGrossProfit > 0 ? 10 : 0);
            const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

            // ROI calculation
            const netRoi = totalTrades > 0 ? (strategyTrades.reduce((acc, t) => acc + (t.pnlPercentage || 0), 0) / totalTrades) : 0;

            const strategyWithStats: Strategy = {
                ...s,
                stats: {
                    totalTrades,
                    winRate,
                    profitFactor,
                    netRoi,
                    totalPnl
                }
            };

            if (!groups[s.name]) groups[s.name] = [];
            groups[s.name].push(strategyWithStats);
        });
        return groups;
    }, [strategies, trades]);

    // Determine current version count for modal
    const currentVersionCount = editingStrategyId
        ? strategies.filter(s => s.name === formData.name).length
        : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12 relative">
            {/* Header Section */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <i className="fa-solid fa-folder-open text-purple-400 text-2xl"></i>
                    <h1 className="text-3xl font-bold text-white">Playbook</h1>
                </div>
                <p className="text-slate-400 max-w-2xl">
                    Manage your trading strategies and tags to refine your edge. Define your rules, track performance per strategy, and optimize your execution.
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 rounded-xl bg-[#0F1218] p-1 w-fit border border-slate-800/50">
                {['Strategies', 'Goals & Risk', 'Tags'].map((tab) => {
                    const id = tab.toLowerCase().replace(/ & /g, '-');
                    const isActive = activeTab === id || (tab === 'Strategies' && activeTab === 'strategies');
                    return (
                        <button
                            key={tab}
                            onClick={() => onTabChange(id)}
                            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all ${isActive
                                ? 'bg-[#1E2330] text-white shadow-lg shadow-black/20 ring-1 ring-white/5'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-[#1E2330]/50'
                                }`}
                        >
                            {tab === 'Strategies' && <i className="fa-solid fa-chess-board text-xs"></i>}
                            {tab === 'Goals & Risk' && <i className="fa-solid fa-shield-halved text-xs"></i>}
                            {tab === 'Tags' && <i className="fa-solid fa-tags text-xs"></i>}
                            {tab}
                        </button>
                    );
                })}
            </div>

            {/* Strategies Section */}
            {activeTab === 'strategies' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">Strategies</h2>
                        <button
                            onClick={() => {
                                setEditingStrategyId(null);
                                setFormData(initialFormState);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:bg-[#7C3AED] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all"
                        >
                            <i className="fa-solid fa-plus"></i> New Strategy
                        </button>
                    </div>

                    <div className="grid gap-6">
                        {Object.entries(groupedStrategies).map(([name, versions]) => (
                            <StrategyCard
                                key={name}
                                versions={versions}
                                onToggleStatus={toggleStrategyStatus}
                                onEdit={handleEditStrategy}
                                onDelete={handleDeleteStrategy}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Logic */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-[#0B0E14] rounded-2xl border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between border-b border-slate-800 p-6 bg-[#0B0E14] shrink-0 rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    {editingStrategyId ? `Edit Strategy (v${formData.version})` : 'Add New Strategy'}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    {editingStrategyId
                                        ? 'Update existing or save as new version.'
                                        : 'Define the parameters for a new trading strategy.'}
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar">

                            {/* Strategy Name */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Strategy Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., 'Momentum Breakout'"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    // If creating a version of existing, name should probably be locked or treated carefully
                                    className="w-full rounded-lg bg-[#0B0E14] border border-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-[#8B5CF6] focus:outline-none transition-all"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
                                <textarea
                                    rows={3}
                                    placeholder="A short summary of this strategy."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full rounded-lg bg-[#0B0E14] border border-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-[#8B5CF6] focus:outline-none resize-none transition-all"
                                ></textarea>
                            </div>

                            {/* Entry Rules Box */}
                            <div className="rounded-xl border border-slate-800 p-5 bg-[#0B0E14]/50 space-y-4">
                                <h4 className="text-sm font-bold text-white text-center mb-2">Entry Rules</h4>
                                <ListBuilder
                                    label="Primary (Mandatory)"
                                    items={formData.entryPrimary}
                                    onUpdate={(items) => setFormData({ ...formData, entryPrimary: items })}
                                    placeholder="Add a condition"
                                />
                                <ListBuilder
                                    label="Secondary (Optional)"
                                    items={formData.entrySecondary}
                                    onUpdate={(items) => setFormData({ ...formData, entrySecondary: items })}
                                    placeholder="Add a condition"
                                />
                            </div>

                            {/* Exit Rules Box */}
                            <div className="rounded-xl border border-slate-800 p-5 bg-[#0B0E14]/50 space-y-4">
                                <h4 className="text-sm font-bold text-white text-center mb-2">Exit Rules</h4>
                                <ListBuilder
                                    label="Primary (Mandatory)"
                                    items={formData.exitPrimary}
                                    onUpdate={(items) => setFormData({ ...formData, exitPrimary: items })}
                                    placeholder="Add a condition"
                                />
                                <ListBuilder
                                    label="Secondary (Optional)"
                                    items={formData.exitSecondary}
                                    onUpdate={(items) => setFormData({ ...formData, exitSecondary: items })}
                                    placeholder="Add a condition"
                                />
                            </div>

                            {/* Setups */}
                            <ListBuilder
                                label="Setups"
                                items={formData.setups}
                                onUpdate={(items) => setFormData({ ...formData, setups: items })}
                                placeholder="Add a setup (e.g. 'Fair Value Gap')"
                            />

                            {/* Sizing Rules */}
                            <ListBuilder
                                label="Sizing Rules"
                                items={formData.sizingRules}
                                onUpdate={(items) => setFormData({ ...formData, sizingRules: items })}
                                placeholder="Add a sizing rule"
                            />

                            {/* Risk Parameters */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Risk Parameters</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">Max Risk / Trade (%)</label>
                                        <input
                                            type="number"
                                            value={formData.riskParams.maxRiskPerTrade}
                                            onChange={(e) => setFormData({ ...formData, riskParams: { ...formData.riskParams, maxRiskPerTrade: e.target.value } })}
                                            className="w-full rounded-lg bg-[#0B0E14] border border-slate-800 px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">Min R:R Ratio</label>
                                        <input
                                            type="number"
                                            value={formData.riskParams.minRR}
                                            onChange={(e) => setFormData({ ...formData, riskParams: { ...formData.riskParams, minRR: e.target.value } })}
                                            className="w-full rounded-lg bg-[#0B0E14] border border-slate-800 px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-600 uppercase mb-1 block">Daily Max Drawdown (%)</label>
                                        <input
                                            type="number"
                                            value={formData.riskParams.dailyMaxDD}
                                            onChange={(e) => setFormData({ ...formData, riskParams: { ...formData.riskParams, dailyMaxDD: e.target.value } })}
                                            className="w-full rounded-lg bg-[#0B0E14] border border-slate-800 px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                        <div className="border-t border-slate-800 bg-[#0B0E14] p-6 shrink-0 rounded-b-2xl flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="rounded-lg border border-slate-700 bg-transparent px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>

                            {/* If editing, show "Save as Version X+1" if limit not reached */}
                            {editingStrategyId ? (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSaveAsNewVersion}
                                        disabled={currentVersionCount >= 5}
                                        className={`rounded-lg border px-6 py-2.5 text-sm font-bold transition-all flex items-center gap-2 ${currentVersionCount >= 5
                                            ? 'border-slate-800 bg-slate-900 text-slate-500 cursor-not-allowed'
                                            : 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-[#A78BFA] hover:bg-[#8B5CF6]/20'
                                            }`}
                                        title={currentVersionCount >= 5 ? "Max 5 versions allowed" : "Create next version"}
                                    >
                                        <i className="fa-solid fa-code-branch"></i>
                                        Save as v{formData.version + 1}
                                    </button>
                                    <button
                                        onClick={handleSaveStrategy}
                                        className="rounded-lg bg-[#8B5CF6] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:bg-[#7C3AED] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all"
                                    >
                                        Update v{formData.version}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleSaveStrategy}
                                    className="rounded-lg bg-[#8B5CF6] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:bg-[#7C3AED] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all"
                                >
                                    Create Strategy
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAG CUSTOMIZATION MODAL --- */}
            {isTagModalOpen && editingTag && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-[#0B0E14] rounded-2xl border border-slate-800 shadow-2xl p-6">
                        {/* ... Tag Modal Content ... */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white">Customize Tag: "{editingTag.name}"</h3>
                                <p className="text-xs text-slate-400">Change the visual appearance of your tag.</p>
                            </div>
                            <button onClick={() => setIsTagModalOpen(false)} className="text-slate-500 hover:text-white">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Color Picker */}
                            <div>
                                <label className="text-sm font-bold text-white mb-3 block">Color</label>
                                <div className="flex items-center gap-3">
                                    {Object.keys(TAG_COLORS).map((colorKey) => {
                                        const color = TAG_COLORS[colorKey];
                                        const isSelected = editingTag.color === colorKey;
                                        return (
                                            <button
                                                key={colorKey}
                                                onClick={() => setEditingTag({ ...editingTag, color: colorKey as any })}
                                                className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${color.dot} ${isSelected ? 'ring-2 ring-offset-2 ring-offset-[#0B0E14] ring-white scale-110' : 'opacity-80 hover:opacity-100'
                                                    }`}
                                            ></button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-white">Bold Font</span>
                                    <div
                                        onClick={() => setEditingTag({ ...editingTag, isBold: !editingTag.isBold })}
                                        className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors ${editingTag.isBold ? 'bg-[#8B5CF6]' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transition-transform ${editingTag.isBold ? 'translate-x-5' : ''}`}></div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-white">Glow Effect</span>
                                    <div
                                        onClick={() => setEditingTag({ ...editingTag, hasGlow: !editingTag.hasGlow })}
                                        className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors ${editingTag.hasGlow ? 'bg-[#8B5CF6]' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transition-transform ${editingTag.hasGlow ? 'translate-x-5' : ''}`}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="pt-4 border-t border-slate-800">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preview</p>
                                <div className="flex justify-center p-4 bg-[#151A25] rounded-xl border border-slate-800">
                                    <span className={`px-3 py-1.5 rounded-md text-sm border transition-all duration-300 ${TAG_COLORS[editingTag.color].bg} ${TAG_COLORS[editingTag.color].border} ${TAG_COLORS[editingTag.color].text} ${editingTag.isBold ? 'font-bold' : 'font-medium'} ${editingTag.hasGlow ? TAG_COLORS[editingTag.color].glow : ''}`}>
                                        {editingTag.name}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setIsTagModalOpen(false)}
                                className="px-4 py-2 rounded-lg border border-slate-700 text-sm font-bold text-white hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveTag}
                                className="px-6 py-2 rounded-lg bg-[#8B5CF6] text-sm font-bold text-white hover:bg-[#7C3AED]"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- UNDO NOTIFICATION --- */}


            {/* Goals & Risk Section */}
            {activeTab === 'goals-risk' && (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Profit Goals */}
                    <div className="rounded-2xl border border-slate-800 bg-[#151A25] p-6 lg:p-8">
                        <div className="flex items-center gap-3 mb-2">
                            <i className="fa-solid fa-bullseye text-2xl text-white"></i>
                            <h2 className="text-xl font-bold text-white">Profit Goals</h2>
                        </div>
                        <p className="text-slate-400 text-sm mb-8">Set your daily, weekly, and monthly profit targets in percentage of return.</p>

                        <div className="space-y-6">
                            <GoalInput
                                label="Daily Target (%)"
                                value={localGoals.daily.target}
                                active={localGoals.daily.active}
                                onChange={(v: string) => setLocalGoals({ ...localGoals, daily: { ...localGoals.daily, target: v } })}
                                onToggle={() => setLocalGoals({ ...localGoals, daily: { ...localGoals.daily, active: !localGoals.daily.active } })}
                            />
                            <GoalInput
                                label="Weekly Target (%)"
                                value={localGoals.weekly.target}
                                active={localGoals.weekly.active}
                                onChange={(v: string) => setLocalGoals({ ...localGoals, weekly: { ...localGoals.weekly, target: v } })}
                                onToggle={() => setLocalGoals({ ...localGoals, weekly: { ...localGoals.weekly, active: !localGoals.weekly.active } })}
                            />
                            <GoalInput
                                label="Monthly Target (%)"
                                value={localGoals.monthly.target}
                                active={localGoals.monthly.active}
                                onChange={(v: string) => setLocalGoals({ ...localGoals, monthly: { ...localGoals.monthly, target: v } })}
                                onToggle={() => setLocalGoals({ ...localGoals, monthly: { ...localGoals.monthly, active: !localGoals.monthly.active } })}
                            />
                        </div>

                        <button
                            onClick={handleSaveGoals}
                            className="mt-8 rounded-lg bg-[#8B5CF6] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:bg-[#7C3AED] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all"
                        >
                            Save Goals
                        </button>
                    </div>

                    {/* Risk Management */}
                    <div className="rounded-2xl border border-slate-800 bg-[#151A25] p-6 lg:p-8">
                        <div className="flex items-center gap-3 mb-2">
                            <i className="fa-solid fa-shield-halved text-2xl text-white"></i>
                            <h2 className="text-xl font-bold text-white">Risk Management</h2>
                        </div>
                        <p className="text-slate-400 text-sm mb-8">Define risk limits to enforce discipline. Trade entry will be locked if a limit is breached. Use 0 for no limit.</p>

                        <div className="space-y-6">
                            <RiskInput
                                label="Max Risk Per Trade (%)"
                                value={localRisk.maxRiskPerTrade}
                                onChange={(v: string) => setLocalRisk({ ...localRisk, maxRiskPerTrade: v })}
                            />

                            <div className="grid grid-cols-2 gap-6">
                                <RiskInput
                                    label="Daily DD (%)"
                                    value={localRisk.dailyDD}
                                    onChange={(v: string) => setLocalRisk({ ...localRisk, dailyDD: v })}
                                />
                                <RiskInput
                                    label="Weekly DD (%)"
                                    value={localRisk.weeklyDD}
                                    onChange={(v: string) => setLocalRisk({ ...localRisk, weeklyDD: v })}
                                />
                            </div>

                            <RiskInput
                                label="Monthly DD (%)"
                                value={localRisk.monthlyDD}
                                onChange={(v: string) => setLocalRisk({ ...localRisk, monthlyDD: v })}
                            />

                            <div className="grid grid-cols-2 gap-6">
                                <RiskInput
                                    label="Max Trades / Day"
                                    value={localRisk.maxTradesDay}
                                    onChange={(v: string) => setLocalRisk({ ...localRisk, maxTradesDay: v })}
                                />
                                <RiskInput
                                    label="Max Trades / Week"
                                    value={localRisk.maxTradesWeek}
                                    onChange={(v: string) => setLocalRisk({ ...localRisk, maxTradesWeek: v })}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSaveRisk}
                            className="mt-8 rounded-lg bg-[#8B5CF6] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:bg-[#7C3AED] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all"
                        >
                            Save Risk Limits
                        </button>
                    </div>
                </div>
            )}

            {/* Tags Section */}
            {activeTab === 'tags' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-bold text-white mb-6">Tag Manager</h2>

                    {/* Category Tabs */}
                    <div className="flex items-center gap-8 border-b border-slate-800/50 mb-8 overflow-x-auto">
                        {tagCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTagCategory(cat.id)}
                                className={`flex items-center gap-2 pb-3 text-sm font-medium transition-all relative ${activeTagCategory === cat.id
                                    ? 'text-[#A78BFA]'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                <i className={`fa-solid ${cat.icon}`}></i>
                                {cat.label}
                                {activeTagCategory === cat.id && (
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tags List */}
                    <div className="space-y-3">
                        {(tagList[activeTagCategory] || []).map((tag) => (
                            <div
                                key={tag.id}
                                className="flex items-center justify-between p-4 rounded-xl bg-[#0F1218] border border-slate-800/50 group hover:border-slate-700 transition-all"
                            >
                                {/* Render Tag with Styles */}
                                <span className={`px-2.5 py-1 rounded text-sm transition-all ${TAG_COLORS[tag.color].bg} ${TAG_COLORS[tag.color].border} ${TAG_COLORS[tag.color].text} ${tag.isBold ? 'font-bold' : 'font-medium'} ${tag.hasGlow ? TAG_COLORS[tag.color].glow : ''} border`}>
                                    {tag.name}
                                </span>

                                <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEditTag(tag, activeTagCategory)}
                                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                    >
                                        <i className="fa-solid fa-pen text-xs"></i>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTag(tag.id)}
                                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                    >
                                        <i className="fa-regular fa-trash-can text-xs"></i>
                                    </button>
                                </div>
                            </div>
                        ))}

                        {(!tagList[activeTagCategory] || tagList[activeTagCategory].length === 0) && (
                            <div className="flex flex-col items-center justify-center h-40 rounded-xl bg-[#0F1218]/50 border border-dashed border-slate-800 text-slate-500">
                                <i className="fa-solid fa-tags text-2xl mb-2 opacity-30"></i>
                                <p className="text-sm">No tags found in this category.</p>
                            </div>
                        )}
                    </div>

                    {/* Add Tag Input */}
                    <div className="mt-3 relative">
                        <input
                            type="text"
                            value={newTagValue}
                            onChange={(e) => setNewTagValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                            placeholder={`Add new ${activeTagCategory} tag...`}
                            className="w-full rounded-xl bg-[#0F1218] border border-slate-800 px-5 py-4 text-sm text-white placeholder-slate-500 focus:border-[#8B5CF6] focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]/50 transition-all"
                        />
                        <button
                            onClick={handleAddTag}
                            className="absolute right-2 top-2 bottom-2 rounded-lg bg-[#8B5CF6] px-4 text-xs font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:bg-[#7C3AED] transition-all flex items-center gap-2"
                        >
                            <i className="fa-solid fa-plus"></i> Add
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ListBuilder: React.FC<{
    label?: string;
    items: string[];
    onUpdate: (items: string[]) => void;
    placeholder: string;
    simple?: boolean;
}> = ({ label, items, onUpdate, placeholder, simple }) => {
    const [input, setInput] = useState('');

    const add = () => {
        if (!input.trim()) return;
        onUpdate([...items, input.trim()]);
        setInput('');
    };

    const remove = (idx: number) => {
        onUpdate(items.filter((_, i) => i !== idx));
    };

    return (
        <div className="space-y-2">
            {label && <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>}

            <div className="space-y-2">
                {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded bg-[#151A25] border border-slate-700/50 px-3 py-2">
                        <span className="text-sm text-slate-200">{item}</span>
                        <button onClick={() => remove(idx)} className="text-slate-500 hover:text-rose-400">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder={placeholder}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && add()}
                    className="flex-1 rounded bg-[#0B0E14] border border-slate-800 px-3 py-2 text-sm text-white focus:border-[#8B5CF6] focus:outline-none placeholder-slate-600"
                />
                <button
                    onClick={add}
                    className="rounded bg-[#8B5CF6] px-4 py-2 text-xs font-bold text-white hover:bg-[#7C3AED] transition-colors"
                >
                    Add
                </button>
            </div>
        </div>
    );
};

const StrategyCard: React.FC<{
    versions: Strategy[];
    onToggleStatus: (id: string) => void;
    onEdit: (strategy: Strategy) => void;
    onDelete: (id: string, e: React.MouseEvent) => void
}> = ({ versions, onToggleStatus, onEdit, onDelete }) => {
    // Sort by version (ascending for tabs)
    const sortedVersions = useMemo(() => [...versions].sort((a, b) => a.version - b.version), [versions]);

    // Active Version State (ID based)
    const [activeVerId, setActiveVerId] = useState<string>(
        sortedVersions.length > 0 ? sortedVersions[sortedVersions.length - 1].id : ''
    );

    const [isExpanded, setIsExpanded] = useState(true);

    // Update active version if the current one is deleted or new one added
    useEffect(() => {
        if (sortedVersions.length > 0) {
            // If active ID doesn't exist in current list, default to latest
            const exists = sortedVersions.find(v => v.id === activeVerId);
            if (!exists) {
                setActiveVerId(sortedVersions[sortedVersions.length - 1].id);
            }
        }
    }, [sortedVersions, activeVerId]);

    const strategy = sortedVersions.find(v => v.id === activeVerId) || sortedVersions[0];
    if (!strategy) return null;

    const isActive = strategy.status === 'active';

    return (
        <div className={`overflow-hidden rounded-2xl border bg-[#151A25] transition-all hover:border-slate-700 ${isActive ? 'border-slate-800' : 'border-slate-800 opacity-70'}`}>
            <div className="flex items-center justify-between border-b border-slate-800/50 bg-[#151A25] p-6">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-xl font-bold text-white leading-none">{strategy.name}</h3>
                        {/* Version Tabs */}
                        <div className="flex items-center gap-2 mt-2">
                            {sortedVersions.map(v => (
                                <button
                                    key={v.id}
                                    onClick={(e) => { e.stopPropagation(); setActiveVerId(v.id); }}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all ${v.id === activeVerId
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : 'bg-[#0B0E14] border-slate-700 text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    v{v.version}
                                </button>
                            ))}
                        </div>
                    </div>
                    <span className={`self-start rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border ${isActive
                        ? 'bg-[#2E1065] text-[#A78BFA] border-[#8B5CF6]/20'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}>
                        {strategy.status}
                    </span>
                </div>
                <div className="flex items-center gap-4 self-start">
                    <div className="flex items-center cursor-pointer" onClick={() => onToggleStatus(strategy.id)}>
                        <div className={`w-11 h-6 rounded-full relative shadow-inner transition-colors duration-200 ${isActive ? 'bg-[#8B5CF6]' : 'bg-slate-700'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 ${isActive ? 'right-1' : 'left-1'}`}></div>
                        </div>
                    </div>
                    <div className="h-6 w-px bg-slate-800 mx-2"></div>
                    <button onClick={() => onEdit(strategy)} className="text-slate-500 hover:text-white transition-colors" title="Edit Version">
                        <i className="fa-solid fa-pen text-sm"></i>
                    </button>
                    <button onClick={(e) => onDelete(strategy.id, e)} className="text-slate-500 hover:text-rose-400 transition-colors" title="Delete Version">
                        <i className="fa-regular fa-trash-can text-sm"></i>
                    </button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`text-slate-500 hover:text-white transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    >
                        <i className="fa-solid fa-chevron-down text-sm"></i>
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div key={activeVerId} className="p-6 space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                        <StatBox label="Total Trades" value={(strategy.stats?.totalTrades || 0).toString()} />
                        <StatBox label="Win Rate" value={`${(strategy.stats?.winRate || 0).toFixed(1)}%`} />
                        <StatBox label="Profit Factor" value={(strategy.stats?.profitFactor || 0).toFixed(2)} />
                        <StatBox
                            label="Net ROI"
                            value={(strategy.stats?.netRoi || 0).toFixed(2) + '%'}
                            valueColor={(strategy.stats?.netRoi || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                        />
                        <StatBox
                            label="Total P&L"
                            value={((strategy.stats?.totalPnl || 0) >= 0 ? '$' : '-$') + Math.abs(strategy.stats?.totalPnl || 0).toFixed(2)}
                            valueColor={(strategy.stats?.totalPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                            bg="bg-[#151A25] border-slate-700"
                        />
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm leading-relaxed text-slate-400">
                            {strategy.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs font-bold text-slate-300">Setups</span>
                            {(strategy.setups || []).map((setup, idx) => (
                                <span key={idx} className="rounded-md border border-slate-700 bg-[#1E2330] px-2.5 py-1 text-xs font-medium text-slate-400">
                                    {setup}
                                </span>
                            ))}
                        </div>
                        {strategy.sizingRules && strategy.sizingRules.length > 0 && (
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-xs font-bold text-slate-300">Sizing</span>
                                {(strategy.sizingRules || []).map((rule, idx) => (
                                    <span key={idx} className="rounded-md border border-indigo-500/20 bg-indigo-500/5 px-2.5 py-1 text-xs font-medium text-indigo-300">
                                        {rule}
                                    </span>
                                ))}
                            </div>
                        )}
                        {strategy.riskParams && (
                            <div className="flex flex-wrap items-center gap-6 pt-2">
                                {strategy.riskParams.maxRiskPerTrade ? (
                                    <div className="text-xs">
                                        <span className="text-slate-500 font-bold uppercase mr-2">Max Risk</span>
                                        <span className="text-white font-mono">{strategy.riskParams.maxRiskPerTrade}%</span>
                                    </div>
                                ) : null}
                                {strategy.riskParams.minRR ? (
                                    <div className="text-xs">
                                        <span className="text-slate-500 font-bold uppercase mr-2">Min R:R</span>
                                        <span className="text-white font-mono">{strategy.riskParams.minRR}:1</span>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 pt-6 border-t border-slate-800/50">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                <h4 className="font-bold text-white">Entry Rules</h4>
                            </div>

                            <div>
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Primary</p>
                                <ul className="space-y-2">
                                    {(strategy.entryRules?.primary || []).map((rule, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                            <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-600"></span>
                                            {rule}
                                        </li>
                                    ))}
                                    {(!strategy.entryRules?.primary || strategy.entryRules.primary.length === 0) && <span className="text-xs text-slate-600 italic">None</span>}
                                </ul>
                            </div>

                            <div>
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Secondary</p>
                                <ul className="space-y-2">
                                    {(strategy.entryRules?.secondary || []).map((rule, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                                            <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-700"></span>
                                            {rule}
                                        </li>
                                    ))}
                                    {(!strategy.entryRules?.secondary || strategy.entryRules.secondary.length === 0) && <span className="text-xs text-slate-600 italic">None</span>}
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
                                <h4 className="font-bold text-white">Exit Rules</h4>
                            </div>

                            <div>
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Primary</p>
                                <ul className="space-y-2">
                                    {(strategy.exitRules?.primary || []).map((rule, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                            <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-600"></span>
                                            {rule}
                                        </li>
                                    ))}
                                    {(!strategy.exitRules?.primary || strategy.exitRules.primary.length === 0) && <span className="text-xs text-slate-600 italic">None</span>}
                                </ul>
                            </div>

                            <div>
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Secondary</p>
                                <ul className="space-y-2">
                                    {(strategy.exitRules?.secondary || []).map((rule, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                                            <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-700"></span>
                                            {rule}
                                        </li>
                                    ))}
                                    {(!strategy.exitRules?.secondary || strategy.exitRules.secondary.length === 0) && <span className="text-xs text-slate-600 italic">None</span>}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatBox: React.FC<{ label: string; value: string; valueColor?: string; bg?: string }> = ({
    label, value, valueColor = 'text-white', bg = 'bg-[#0F1218]'
}) => (
    <div className={`rounded-xl border border-slate-800/50 p-4 ${bg}`}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
        <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
    </div>
);

const GoalInput = ({ label, value, active, onChange, onToggle }: { label: string, value: string, active: boolean, onChange: (v: string) => void, onToggle: () => void }) => (
    <div>
        <label className="block text-xs font-bold text-white mb-2">{label}</label>
        <div className="flex items-center gap-4">
            <div className="flex-1 relative">
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-lg bg-[#0B0E14] border border-slate-800 px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none transition-colors"
                />
            </div>
            <button
                onClick={onToggle}
                className={`relative h-7 w-12 rounded-full transition-colors duration-200 ease-in-out ${active ? 'bg-[#8B5CF6]' : 'bg-slate-700'}`}
            >
                <span
                    className={`absolute top-1 left-1 h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${active ? 'translate-x-5' : 'translate-x-0'}`}
                />
            </button>
        </div>
    </div>
);

const RiskInput = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
    <div>
        <label className="block text-xs font-bold text-white mb-2">{label}</label>
        <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg bg-[#0B0E14] border border-slate-800 px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none transition-colors"
        />
    </div>
);

export default Playbook;
