
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '../trade_scenarios');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

function generateCSV(filename, tradeCount, winRate, avgWin, avgLoss) {
    let content = 'Date,Symbol,Side,Price,Quantity,Fee,Realized P&L\n';
    const startDate = new Date('2024-01-01T10:00:00');

    for (let i = 0; i < tradeCount; i++) {
        const isWin = Math.random() < winRate;
        const pnl = isWin ? avgWin : -avgLoss;
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const dateStr = date.toISOString().replace('T', ' ').substring(0, 16);
        content += `${dateStr},BTCUSDT,Long,50000,0.1,2,${pnl}\n`;
    }

    fs.writeFileSync(path.join(outputDir, filename), content);
    console.log(`Generated ${filename} with ${tradeCount} trades.`);
}

// 1. Survivor: ~5 trades (Needs 5), Good stats
generateCSV('1.csv', 8, 0.7, 200, 50);

// 2. Consistent: ~15 trades (Needs 15), Good stats
generateCSV('2.csv', 18, 0.65, 300, 100);

// 3. Warrior: ~30 trades (Needs 30), High stats
generateCSV('3.csv', 35, 0.7, 500, 150);

// 4. Elite: ~50 trades (Needs 50), Very High stats
generateCSV('4.csv', 55, 0.75, 800, 200);

// 5. GOD: ~100 trades (Needs 100), Unicorn stats
generateCSV('5.csv', 110, 0.85, 2000, 300);

// 6. Drawdown Fail: High Volume but Terrible PnL (Should be Survivor/Novice due to metrics)
generateCSV('6.csv', 110, 0.2, 100, 100);
