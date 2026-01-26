
import { Achievement } from '../types';

const TIERS: Achievement['tier'][] = ['Beginner', 'Bronze', 'Silver', 'Gold'];
const CATEGORIES: Achievement['category'][] = ['PnL', 'Discipline', 'Consistency', 'Education', 'Guru'];
const CONDITION_TYPES: Achievement['condition']['type'][] = ['trades_count', 'win_rate', 'pnl_gain', 'streak', 'journal_count'];

export const generateMonthlyAchievements = (month: string): Achievement[] => {
    const achievements: Achievement[] = [];

    // Logic for generating 5 unique achievements for the month
    // We can use the month string as part of the seed or just randomize
    // To satisfy the "Levels 1 to 10 difficulty" and "Beginner to Gold" requirement

    const difficultyLevel = [2, 4, 6, 8, 10]; // Distribute difficulty levels 1-10

    for (let i = 0; i < 5; i++) {
        const difficulty = difficultyLevel[i];
        const tier = difficulty <= 3 ? 'Beginner' : difficulty <= 6 ? 'Bronze' : difficulty <= 8 ? 'Silver' : 'Gold';
        const category = CATEGORIES[i % CATEGORIES.length];
        const condType = CONDITION_TYPES[i % CONDITION_TYPES.length];

        let target = 0;
        let title = '';
        let description = '';

        // Define targets based on condition type and difficulty
        switch (condType) {
            case 'trades_count':
                target = 10 * difficulty;
                title = `${tier} Volume Warrior`;
                description = `Execute ${target} trades this month with discipline.`;
                break;
            case 'win_rate':
                target = 40 + (difficulty * 3);
                title = `${tier} Accuracy Master`;
                description = `Maintain a win rate of over ${target}% across at least 5 trades.`;
                break;
            case 'pnl_gain':
                target = 100 * difficulty * difficulty;
                title = `${tier} Profit Seeker`;
                description = `Capture a total net profit of $${target.toLocaleString()} from your setups.`;
                break;
            case 'streak':
                target = Math.max(2, Math.floor(difficulty / 2) + 1);
                title = `${tier} Hot Streak`;
                description = `Achieve a winning streak of ${target} consecutive trades.`;
                break;
            case 'journal_count':
                target = Math.max(3, difficulty * 2);
                title = `${tier} Scribbler`;
                description = `Complete ${target} detailed journal entries this month.`;
                break;
        }

        achievements.push({
            id: `ach-${month}-${i}`,
            title,
            description,
            difficulty,
            tier,
            category,
            condition: {
                type: condType,
                target
            },
            progress: 0,
            isUnlocked: false,
            month
        });
    }

    return achievements;
};

export const updateAchievementProgress = (achievements: Achievement[], data: {
    trades: any[],
    journalEntries: any[],
    month: string
}): Achievement[] => {
    return achievements.map(ach => {
        if (ach.isUnlocked || ach.month !== data.month) return ach;

        let currentProgress = 0;
        const currentMonthTrades = data.trades.filter(t => t.entryDate.startsWith(data.month));

        switch (ach.condition.type) {
            case 'trades_count':
                currentProgress = (currentMonthTrades.length / ach.condition.target) * 100;
                break;
            case 'win_rate':
                if (currentMonthTrades.length >= 5) {
                    const wins = currentMonthTrades.filter(t => (t.pnl || 0) > 0).length;
                    const wr = (wins / currentMonthTrades.length) * 100;
                    currentProgress = (wr / ach.condition.target) * 100;
                }
                break;
            case 'pnl_gain':
                const totalPnL = currentMonthTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
                currentProgress = totalPnL > 0 ? (totalPnL / ach.condition.target) * 100 : 0;
                break;
            case 'streak':
                let maxStreak = 0;
                let currentStreak = 0;
                // Sort by date
                const sorted = [...currentMonthTrades].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
                sorted.forEach(t => {
                    if ((t.pnl || 0) > 0) {
                        currentStreak++;
                        if (currentStreak > maxStreak) maxStreak = currentStreak;
                    } else {
                        currentStreak = 0;
                    }
                });
                currentProgress = (maxStreak / ach.condition.target) * 100;
                break;
            case 'journal_count':
                const currentMonthJournals = data.journalEntries.filter(j => j.date.startsWith(data.month));
                currentProgress = (currentMonthJournals.length / ach.condition.target) * 100;
                break;
        }

        const finalProgress = Math.min(100, currentProgress);
        const isUnlocked = finalProgress >= 100;

        return {
            ...ach,
            progress: finalProgress,
            isUnlocked,
            unlockedAt: isUnlocked ? new Date().toISOString() : undefined
        };
    });
};
