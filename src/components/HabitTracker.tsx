
import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Habit, HabitCompletions } from '../types';

interface HabitTrackerProps {
    habits: Habit[];
    setHabits: (habits: Habit[]) => void;
    completions: HabitCompletions;
    setCompletions: React.Dispatch<React.SetStateAction<HabitCompletions>>;
}

const HabitTracker: React.FC<HabitTrackerProps> = ({ habits, setHabits, completions, setCompletions }) => {
    // --- State ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isEditMode, setIsEditMode] = useState(false);
    const [newHabitName, setNewHabitName] = useState('');

    // --- Date Logic ---
    const daysInMonth = useMemo((): number => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        return new Date(year, month + 1, 0).getDate();
    }, [currentDate]);

    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Group days into weeks for the grid
    const weeks = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const result: { weekNum: number; days: { date: number; dayName: string; fullDate: string }[] }[] = [];

        let currentWeek: { date: number; dayName: string; fullDate: string }[] = [];
        let weekCounter = 1;

        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month, day);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue...
            const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            currentWeek.push({ date: day, dayName, fullDate });

            // If Sunday (0) or Last Day of Month, push week
            if (dateObj.getDay() === 0 || day === daysInMonth) {
                result.push({ weekNum: weekCounter++, days: currentWeek });
                currentWeek = [];
            }
        }
        return result;
    }, [currentDate, daysInMonth]);

    // --- Actions ---
    const toggleHabit = (habitId: string, dateStr: string) => {
        const key = `${habitId}_${dateStr}`;
        setCompletions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    const addHabit = () => {
        if (!newHabitName.trim()) return;
        setHabits([...habits, { id: Date.now().toString(), name: newHabitName }]);
        setNewHabitName('');
    };

    const removeHabit = (id: string) => {
        setHabits(habits.filter(h => h.id !== id));
    };

    // --- Stats Calculations ---

    // Calculate stats per day (Vertical columns)
    const dailyStats = useMemo(() => {
        const stats: Record<string, { done: number; total: number; percentage: number }> = {};
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            let doneCount = 0;

            habits.forEach(h => {
                if (completions[`${h.id}_${dateStr}`]) doneCount++;
            });

            stats[dateStr] = {
                done: doneCount,
                total: habits.length,
                percentage: habits.length > 0 ? Math.round((doneCount / habits.length) * 100) : 0
            };
        }
        return stats;
    }, [habits, completions, currentDate, daysInMonth]);

    // Chart Data
    const chartData = useMemo(() => {
        return Object.keys(dailyStats).sort().map(dateStr => ({
            day: parseInt(dateStr.split('-')[2] || '1'),
            percentage: dailyStats[dateStr]?.percentage || 0
        }));
    }, [dailyStats]);

    // Monthly Overview
    const monthlyTotalHabits: number = habits.length * daysInMonth;
    const statsValues = Object.values(dailyStats) as { done: number }[];
    const monthlyCompleted: number = statsValues.reduce((acc, curr) => acc + curr.done, 0);
    const monthlyProgress: number = monthlyTotalHabits > 0 ? (monthlyCompleted / monthlyTotalHabits) * 100 : 0;


    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-8">

            {/* 1. Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                            <i className="fa-solid fa-check-double text-purple-400"></i>
                        </div>
                        <h1 className="text-3xl font-bold text-white">Habit Tracker</h1>
                    </div>
                    <p className="text-slate-400 pl-[52px]">Monitor and cultivate your daily discipline.</p>
                </div>

                <div className="flex items-center gap-4 pl-[52px] md:pl-0">
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${isEditMode
                                ? 'bg-purple-500/10 border-purple-500/50 text-purple-300'
                                : 'bg-[#151A25] border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
                            }`}
                    >
                        <i className={`fa-solid ${isEditMode ? 'fa-check' : 'fa-pen'}`}></i>
                        {isEditMode ? 'Done Editing' : 'Edit Habits'}
                    </button>

                    <div className="flex items-center bg-[#151A25] rounded-lg border border-slate-700 p-1">
                        <button onClick={() => changeMonth(-1)} className="h-8 w-8 flex items-center justify-center rounded text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                            <i className="fa-solid fa-chevron-left text-xs"></i>
                        </button>
                        <span className="px-4 text-sm font-bold text-white min-w-[140px] text-center">{monthName}</span>
                        <button onClick={() => changeMonth(1)} className="h-8 w-8 flex items-center justify-center rounded text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                            <i className="fa-solid fa-chevron-right text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Monthly Progress Summary */}
            <div className="rounded-2xl border border-slate-800 bg-[#151A25] p-6">
                <h3 className="text-lg font-bold text-white mb-6">Monthly Progress</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Number of habits</p>
                        <p className="text-3xl font-bold text-white">{habits.length}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Completed habits</p>
                        <p className="text-3xl font-bold text-white">{monthlyCompleted}</p>
                    </div>
                    <div className="md:col-span-2">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                            <span>Progress</span>
                            <span>{monthlyProgress.toFixed(1)}%</span>
                        </div>
                        <div className="h-4 w-full bg-[#0B0E14] rounded-full overflow-hidden border border-slate-800/50">
                            <div
                                style={{ width: `${monthlyProgress}%` }}
                                className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full shadow-[0_0_15px_rgba(147,51,234,0.4)] transition-all duration-700 ease-out"
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Main Tracker Grid */}
            <div className="rounded-2xl border border-slate-800 bg-[#151A25] overflow-hidden">
                <div className="overflow-x-auto pb-2 custom-scrollbar">
                    <div className="min-w-max">
                        <div className="flex">

                            {/* Left Sticky Column: Habit Names */}
                            <div className="sticky left-0 z-20 bg-[#151A25] shadow-[4px_0_24px_rgba(0,0,0,0.5)] min-w-[260px] border-r border-slate-800">
                                {/* Header Placeholder */}
                                <div className="h-[105px] border-b border-slate-800 p-4 flex items-end">
                                    <span className="text-sm font-bold text-white uppercase tracking-wider">My Habits</span>
                                </div>

                                {/* Habit List */}
                                <div className="divide-y divide-slate-800/50">
                                    {habits.map((habit) => (
                                        <div key={habit.id} className="h-12 px-4 flex items-center justify-between group">
                                            <span className="text-sm font-medium text-slate-300 truncate pr-2">{habit.name}</span>
                                            {isEditMode && (
                                                <button
                                                    onClick={() => removeHabit(habit.id)}
                                                    className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/10 p-1 rounded"
                                                >
                                                    <i className="fa-solid fa-trash text-xs"></i>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {/* Stats Rows Labels */}
                                    <div className="h-12 px-4 flex items-center text-sm font-bold text-slate-400">Progress</div>
                                    <div className="h-12 px-4 flex items-center text-sm font-bold text-emerald-400">Done</div>
                                    <div className="h-12 px-4 flex items-center text-sm font-bold text-rose-400">Not Done</div>
                                </div>

                                {/* Add Habit Input */}
                                {isEditMode && (
                                    <div className="p-3 border-t border-slate-800 bg-[#0B0E14]">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newHabitName}
                                                onChange={(e) => setNewHabitName(e.target.value)}
                                                placeholder="New habit..."
                                                className="w-full bg-[#151A25] border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-purple-500 focus:outline-none"
                                                onKeyDown={(e) => e.key === 'Enter' && addHabit()}
                                            />
                                            <button
                                                onClick={addHabit}
                                                className="bg-purple-600 text-white rounded px-2 text-xs hover:bg-purple-500"
                                            >
                                                <i className="fa-solid fa-plus"></i>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Grid Columns (Weeks -> Days) */}
                            <div className="flex">
                                {weeks.map((week) => (
                                    <div key={week.weekNum} className="flex flex-col border-r border-slate-800/50">
                                        {/* Week Header */}
                                        <div className="h-8 flex items-center justify-center border-b border-slate-800 bg-[#0B0E14] text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Week {week.weekNum}
                                        </div>

                                        {/* Days Sub-header */}
                                        <div className="flex border-b border-slate-800">
                                            {week.days.map((day) => (
                                                <div key={day.fullDate} className="w-10 flex flex-col items-center justify-center py-2 gap-1 border-r border-slate-800/30 last:border-0">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">{day.dayName}</span>
                                                    <span className={`text-sm font-bold ${day.fullDate === new Date().toISOString().split('T')[0] ? 'text-purple-400' : 'text-white'
                                                        }`}>{day.date}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Checkboxes Area */}
                                        <div className="divide-y divide-slate-800/50">
                                            {habits.map((habit) => (
                                                <div key={habit.id} className="flex h-12 bg-[#151A25]">
                                                    {week.days.map((day) => {
                                                        const isChecked = completions[`${habit.id}_${day.fullDate}`];
                                                        return (
                                                            <div key={day.fullDate} className="w-10 flex items-center justify-center border-r border-slate-800/30 last:border-0">
                                                                <button
                                                                    onClick={() => toggleHabit(habit.id, day.fullDate)}
                                                                    className={`h-5 w-5 rounded border transition-all duration-200 flex items-center justify-center ${isChecked
                                                                            ? 'bg-purple-600 border-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.4)]'
                                                                            : 'bg-[#0B0E14] border-slate-700 hover:border-slate-500'
                                                                        }`}
                                                                >
                                                                    {isChecked && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ))}

                                            {/* Stats Rows Data */}
                                            <div className="flex h-12 bg-[#0B0E14]/30">
                                                {week.days.map((day) => {
                                                    const stat = dailyStats[day.fullDate] || { percentage: 0, done: 0, total: 0 };
                                                    return (
                                                        <div key={day.fullDate} className="w-10 flex items-center justify-center border-r border-slate-800/30 text-[10px] font-bold text-slate-400">
                                                            {stat.percentage}%
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            <div className="flex h-12 bg-[#0B0E14]/30">
                                                {week.days.map((day) => {
                                                    const stat = dailyStats[day.fullDate] || { percentage: 0, done: 0, total: 0 };
                                                    return (
                                                        <div key={day.fullDate} className="w-10 flex items-center justify-center border-r border-slate-800/30 text-[10px] font-bold text-emerald-500">
                                                            {stat.done}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            <div className="flex h-12 bg-[#0B0E14]/30">
                                                {week.days.map((day) => {
                                                    const stat = dailyStats[day.fullDate] || { percentage: 0, done: 0, total: 0 };
                                                    return (
                                                        <div key={day.fullDate} className="w-10 flex items-center justify-center border-r border-slate-800/30 text-[10px] font-bold text-rose-500">
                                                            {stat.total - stat.done}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Flow of Discipline Chart */}
            <div className="rounded-2xl border border-slate-800 bg-[#151A25] p-6">
                <h3 className="text-lg font-bold text-white mb-6">Flow of Discipline</h3>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                itemStyle={{ color: '#a78bfa' }}
                                formatter={(value: number) => [`${value}%`, 'Completion']}
                                labelFormatter={(label) => `Day ${label}`}
                            />
                            <Area
                                type="monotone"
                                dataKey="percentage"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorFlow)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
};

export default HabitTracker;
