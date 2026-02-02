
import React from 'react';
import { Achievement } from '../types';

interface AchievementsProps {
    achievements: Achievement[];
}

const TIER_COLORS = {
    'Beginner': 'text-slate-400 border-slate-700 bg-slate-800/10',
    'Bronze': 'text-orange-400 border-orange-500/20 bg-orange-500/5',
    'Silver': 'text-slate-200 border-slate-300/30 bg-slate-300/5',
    'Gold': 'text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
};

const Achievements: React.FC<AchievementsProps> = ({ achievements }) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonth = achievements.filter(a => a.month === currentMonth);
    const pastAchievements = achievements.filter(a => a.month !== currentMonth && a.isUnlocked);

    return (
        <div className="space-y-8 pb-12">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter italic">Guruji's Challenges</h1>
                    <p className="text-slate-400 text-sm max-w-xl">
                        Every month, Guruji sets five unique paths for you to master. Complete them to elevate your trading rank.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-[#151A25] p-3 rounded-xl border border-slate-800">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <i className="fa-solid fa-trophy"></i>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Unlocked This Month</p>
                        <p className="text-lg font-bold text-white">{thisMonth.filter(a => a.isUnlocked).length} / 5</p>
                    </div>
                </div>
            </div>

            {/* Current Month Challenges */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {thisMonth.map((ach) => (
                    <div
                        key={ach.id}
                        className={`relative rounded-2xl border p-6 overflow-hidden transition-all hover:scale-[1.02] ${ach.isUnlocked ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-slate-800 bg-[#151A25]'}`}
                    >
                        {/* Glow effect for unlocked */}
                        {ach.isUnlocked && <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/20 blur-[40px] rounded-full"></div>}

                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${TIER_COLORS[ach.tier]}`}>
                                {ach.tier} Level
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">Diff: {ach.difficulty}/10</span>
                        </div>

                        <h3 className={`text-lg font-bold mb-2 ${ach.isUnlocked ? 'text-white' : 'text-slate-300'}`}>{ach.title}</h3>
                        <p className="text-xs text-slate-500 mb-6 leading-relaxed line-clamp-2">{ach.description}</p>

                        <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-bold uppercase">
                                <span className="text-slate-500">Progress</span>
                                <span className={ach.isUnlocked ? 'text-emerald-400' : 'text-white'}>{Math.round(ach.progress)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-[#0B0E14] rounded-full overflow-hidden">
                                <div
                                    style={{ width: `${ach.progress}%` }}
                                    className={`h-full rounded-full transition-all duration-1000 ${ach.isUnlocked ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                ></div>
                            </div>
                        </div>

                        {ach.isUnlocked && (
                            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-500 animate-in fade-in slide-in-from-top-1">
                                <i className="fa-solid fa-circle-check"></i>
                                CHALLENGE MASTERED
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Achievement Collection (Past) */}
            {pastAchievements.length > 0 && (
                <div className="pt-8">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <i className="fa-solid fa-medal text-slate-500"></i>
                        Hall of Achievements
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {pastAchievements.map((ach) => (
                            <div key={ach.id} className="group relative bg-[#151A25]/50 border border-slate-800 p-4 rounded-xl text-center hover:border-slate-600 transition-all">
                                <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 border border-slate-700 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 transition-all">
                                    <i className="fa-solid fa-award text-xl text-slate-500 group-hover:text-indigo-400"></i>
                                </div>
                                <h4 className="text-[10px] font-bold text-white uppercase truncate">{ach.title}</h4>
                                <p className="text-[8px] text-slate-600">{ach.month}</p>

                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black rounded border border-slate-800 text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-2xl">
                                    {ach.description}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Achievements;
