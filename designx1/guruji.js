/**
 * Guruji AI Chatbot - Trading Mentor
 * Powered by OpenRouter API
 * With access to Trade Log and Analytics data
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// System prompt with trading mentor personality
const SYSTEM_PROMPT = `You are Guruji, a wise and experienced AI trading mentor. You speak with warmth and wisdom, occasionally using Indian spiritual terminology like "Namaste", "Dharma" (duty/path), and "Sadhana" (practice/discipline).

Your expertise includes:
- Technical analysis (candlestick patterns, indicators, chart patterns)
- Trading psychology and emotional discipline
- Risk management and position sizing
- Trading strategies and setups
- Market structure and price action
- Journal analysis and self-improvement

Guidelines:
1. Be encouraging but realistic about trading
2. Emphasize discipline, patience, and process over profits
3. Always remind about risk management when relevant
4. Use analogies and examples to explain concepts
5. Keep responses concise but comprehensive
6. Format responses with markdown for readability
7. When analyzing trade data, be specific with numbers and patterns
8. End important advice with an inspiring quote or wisdom

Remember: You are a mentor, not a financial advisor. Always remind users that trading involves risk and they should do their own research.`;

// ============================================================================
// STATE
// ============================================================================

let conversationHistory = [];
let isLoading = false;
let tradingContext = null;

// ============================================================================
// TRADING DATA ACCESS
// ============================================================================

/**
 * Gather trading data for AI context
 */
function gatherTradingData() {
    try {
        // Check if data manager exists
        if (typeof dataManager === 'undefined') {
            return null;
        }

        const trades = dataManager.getTrades() || [];
        const strategies = dataManager.getStrategies() || [];
        const profitGoals = dataManager.getProfitGoals() || {};
        const riskSettings = dataManager.getRiskSettings() || {};
        const profile = dataManager.getProfile() || {};
        const transactions = dataManager.getTransactions() || [];

        // Get portfolio trades (excluding DATA type)
        const portfolioTrades = trades.filter(t => t.tradeType !== 'DATA');
        const closedTrades = portfolioTrades.filter(t => t.status === 'CLOSED');
        const openTrades = portfolioTrades.filter(t => t.status === 'OPEN');

        // Calculate key metrics
        const totalTrades = closedTrades.length;
        const wins = closedTrades.filter(t => (t.pnl || 0) > 0);
        const losses = closedTrades.filter(t => (t.pnl || 0) < 0);
        const winRate = totalTrades > 0 ? (wins.length / totalTrades * 100).toFixed(1) : 0;

        const totalPnL = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
        const avgWin = wins.length > 0 ? wins.reduce((acc, t) => acc + (t.pnl || 0), 0) / wins.length : 0;
        const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((acc, t) => acc + (t.pnl || 0), 0) / losses.length) : 0;
        const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;

        // Get recent trades (last 10)
        const recentTrades = closedTrades
            .sort((a, b) => new Date(b.exitDate) - new Date(a.exitDate))
            .slice(0, 10);

        // Calculate streak
        let currentStreak = 0;
        let streakType = null;
        for (const trade of recentTrades) {
            const isWin = (trade.pnl || 0) > 0;
            if (streakType === null) {
                streakType = isWin ? 'win' : 'loss';
                currentStreak = 1;
            } else if ((isWin && streakType === 'win') || (!isWin && streakType === 'loss')) {
                currentStreak++;
            } else {
                break;
            }
        }

        // Strategy performance
        const strategyPerformance = {};
        closedTrades.forEach(trade => {
            const strat = trade.strategy || 'Unknown';
            if (!strategyPerformance[strat]) {
                strategyPerformance[strat] = { trades: 0, wins: 0, pnl: 0 };
            }
            strategyPerformance[strat].trades++;
            if ((trade.pnl || 0) > 0) strategyPerformance[strat].wins++;
            strategyPerformance[strat].pnl += trade.pnl || 0;
        });

        // Symbol performance
        const symbolPerformance = {};
        closedTrades.forEach(trade => {
            const symbol = trade.symbol || 'Unknown';
            if (!symbolPerformance[symbol]) {
                symbolPerformance[symbol] = { trades: 0, wins: 0, pnl: 0 };
            }
            symbolPerformance[symbol].trades++;
            if ((trade.pnl || 0) > 0) symbolPerformance[symbol].wins++;
            symbolPerformance[symbol].pnl += trade.pnl || 0;
        });

        // Day of week performance
        const dayPerformance = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        closedTrades.forEach(trade => {
            if (trade.exitDate) {
                const day = dayNames[new Date(trade.exitDate).getDay()];
                dayPerformance[day] += trade.pnl || 0;
            }
        });

        // Calculate portfolio balance
        const totalDeposits = transactions.filter(t => t.type === 'DEPOSIT').reduce((acc, t) => acc + t.amount, 0);
        const totalWithdrawals = transactions.filter(t => t.type === 'WITHDRAWAL').reduce((acc, t) => acc + t.amount, 0);
        const portfolioBalance = totalDeposits - totalWithdrawals + totalPnL;

        // Today's performance
        const today = new Date().toDateString();
        const todayTrades = closedTrades.filter(t => new Date(t.exitDate).toDateString() === today);
        const todayPnL = todayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

        return {
            summary: {
                totalTrades,
                winRate: parseFloat(winRate),
                totalPnL: totalPnL.toFixed(2),
                avgWin: avgWin.toFixed(2),
                avgLoss: avgLoss.toFixed(2),
                profitFactor: profitFactor.toFixed(2),
                portfolioBalance: portfolioBalance.toFixed(2),
                openPositions: openTrades.length,
                currentStreak: `${currentStreak} ${streakType || 'none'}`,
                todayPnL: todayPnL.toFixed(2),
                todayTrades: todayTrades.length
            },
            recentTrades: recentTrades.map(t => ({
                symbol: t.symbol,
                side: t.side,
                entryPrice: t.entryPrice,
                exitPrice: t.exitPrice,
                pnl: (t.pnl || 0).toFixed(2),
                strategy: t.strategy,
                date: t.exitDate ? new Date(t.exitDate).toLocaleDateString() : 'N/A'
            })),
            openPositions: openTrades.map(t => ({
                symbol: t.symbol,
                side: t.side,
                entryPrice: t.entryPrice,
                strategy: t.strategy
            })),
            strategyPerformance: Object.entries(strategyPerformance).map(([name, data]) => ({
                name,
                trades: data.trades,
                winRate: data.trades > 0 ? ((data.wins / data.trades) * 100).toFixed(1) : 0,
                pnl: data.pnl.toFixed(2)
            })),
            symbolPerformance: Object.entries(symbolPerformance)
                .sort((a, b) => b[1].pnl - a[1].pnl)
                .slice(0, 5)
                .map(([name, data]) => ({
                    name,
                    trades: data.trades,
                    winRate: data.trades > 0 ? ((data.wins / data.trades) * 100).toFixed(1) : 0,
                    pnl: data.pnl.toFixed(2)
                })),
            dayPerformance,
            goals: {
                dailyTarget: profitGoals.daily?.target || 0,
                weeklyTarget: profitGoals.weekly?.target || 0,
                monthlyTarget: profitGoals.monthly?.target || 0
            },
            riskLimits: {
                dailyDD: riskSettings.dailyDD || 5,
                maxTradesPerDay: riskSettings.maxTradesDay || 0
            }
        };
    } catch (e) {
        console.error('Error gathering trading data:', e);
        return null;
    }
}

/**
 * Format trading data as context for AI
 */
function formatTradingContext() {
    const data = gatherTradingData();
    if (!data) return '';

    return `
--- TRADER'S CURRENT DATA ---

📊 PERFORMANCE SUMMARY:
- Total Closed Trades: ${data.summary.totalTrades}
- Win Rate: ${data.summary.winRate}%
- Total P&L: $${data.summary.totalPnL}
- Average Win: $${data.summary.avgWin}
- Average Loss: $${data.summary.avgLoss}
- Profit Factor: ${data.summary.profitFactor}
- Portfolio Balance: $${data.summary.portfolioBalance}
- Open Positions: ${data.summary.openPositions}
- Current Streak: ${data.summary.currentStreak}

📅 TODAY'S PERFORMANCE:
- Trades Today: ${data.summary.todayTrades}
- Today's P&L: $${data.summary.todayPnL}

🎯 GOALS & LIMITS:
- Daily Target: ${data.goals.dailyTarget}%
- Weekly Target: ${data.goals.weeklyTarget}%
- Monthly Target: ${data.goals.monthlyTarget}%
- Daily Drawdown Limit: ${data.riskLimits.dailyDD}%
- Max Trades/Day: ${data.riskLimits.maxTradesPerDay || 'Unlimited'}

📈 RECENT TRADES (Last 10):
${data.recentTrades.map(t => `- ${t.date}: ${t.symbol} ${t.side} | P&L: $${t.pnl} | Strategy: ${t.strategy}`).join('\n')}

${data.openPositions.length > 0 ? `
🔴 OPEN POSITIONS:
${data.openPositions.map(t => `- ${t.symbol} ${t.side} @ ${t.entryPrice} | Strategy: ${t.strategy}`).join('\n')}
` : ''}

📊 STRATEGY PERFORMANCE:
${data.strategyPerformance.map(s => `- ${s.name}: ${s.trades} trades, ${s.winRate}% win rate, P&L: $${s.pnl}`).join('\n')}

💹 TOP SYMBOLS:
${data.symbolPerformance.map(s => `- ${s.name}: ${s.trades} trades, ${s.winRate}% win rate, P&L: $${s.pnl}`).join('\n')}

📆 DAY OF WEEK P&L:
${Object.entries(data.dayPerformance).map(([day, pnl]) => `- ${day}: $${pnl.toFixed(2)}`).join('\n')}

--- END OF DATA ---
`;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Load required scripts if not already loaded
    loadRequiredScripts().then(() => {
        // Load chat history from localStorage
        loadChatHistory();

        // Auto-resize textarea
        const textarea = document.getElementById('chat-input');
        textarea.addEventListener('input', autoResizeTextarea);

        // Focus on input
        textarea.focus();

        // Update trading context
        tradingContext = formatTradingContext();
    });
});

/**
 * Load required data scripts
 */
async function loadRequiredScripts() {
    const scripts = ['constants.js', 'calculations.js', 'data-manager.js'];

    for (const src of scripts) {
        if (!document.querySelector(`script[src="${src}"]`)) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = () => {
                    console.warn(`Failed to load ${src}`);
                    resolve(); // Continue anyway
                };
                document.head.appendChild(script);
            });
        }
    }

    // Wait a bit for scripts to initialize
    await new Promise(resolve => setTimeout(resolve, 200));
}

// ============================================================================
// CHAT FUNCTIONS
// ============================================================================

/**
 * Send a message to Guruji
 */
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message || isLoading) return;

    // Add user message to UI
    addMessageToUI('user', message);

    // Clear input
    input.value = '';
    autoResizeTextarea();

    // Add to conversation history
    conversationHistory.push({
        role: 'user',
        content: message
    });

    // Show typing indicator
    showTypingIndicator();

    try {
        isLoading = true;
        updateSendButton();

        // Refresh trading context before each message
        tradingContext = formatTradingContext();

        // Call OpenRouter API
        const response = await callOpenRouterAPI(message);

        // Remove typing indicator
        hideTypingIndicator();

        // Add assistant response to UI
        addMessageToUI('assistant', response);

        // Add to conversation history
        conversationHistory.push({
            role: 'assistant',
            content: response
        });

        // Save chat history
        saveChatHistory();

    } catch (error) {
        console.error('Error calling OpenRouter API:', error);
        hideTypingIndicator();
        addMessageToUI('assistant', '🙏 Apologies, I encountered an error. Please try again. The path of learning sometimes has obstacles.');
    } finally {
        isLoading = false;
        updateSendButton();
    }
}

/**
 * Call the OpenRouter API with trading context
 */
async function callOpenRouterAPI(userMessage) {
    // Build system prompt with trading data
    let enhancedSystemPrompt = SYSTEM_PROMPT;

    if (tradingContext) {
        enhancedSystemPrompt += `\n\nYou have access to this trader's actual trading data. Use it to provide personalized analysis and advice:\n${tradingContext}`;
    }

    const messages = [
        { role: 'system', content: enhancedSystemPrompt },
        ...conversationHistory.slice(-10), // Keep last 10 messages for context
        { role: 'user', content: userMessage }
    ];

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'VYUHA Trading Dashboard'
        },
        body: JSON.stringify({
            model: 'google/gemini-2.0-flash-001',
            messages: messages,
            temperature: 0.7,
            max_tokens: 2048
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'I could not generate a response.';
}

/**
 * Send a quick prompt
 */
function sendQuickPrompt(prompt) {
    const input = document.getElementById('chat-input');
    input.value = prompt;
    sendMessage();
}

/**
 * Clear chat history
 */
function clearChat() {
    if (!confirm('Are you sure you want to clear the chat history?')) return;

    conversationHistory = [];
    localStorage.removeItem('guruji_chat_history');

    // Clear UI except welcome message
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = '';
    addWelcomeMessage();
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

/**
 * Add a message to the UI
 */
function addMessageToUI(role, content) {
    const messagesContainer = document.getElementById('chat-messages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (role === 'user') {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">You</span>
                    <span class="message-time">${timeStr}</span>
                </div>
                <div class="message-text">${escapeHtml(content)}</div>
            </div>
            <div class="message-avatar user-avatar">
                <i class="fa-solid fa-user"></i>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fa-solid fa-om"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">Guruji</span>
                    <span class="message-time">${timeStr}</span>
                </div>
                <div class="message-text">${formatMarkdown(content)}</div>
            </div>
        `;
    }

    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Add welcome message
 */
function addWelcomeMessage() {
    const messagesContainer = document.getElementById('chat-messages');
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'message assistant';

    // Check if we have trading data
    const hasData = typeof dataManager !== 'undefined' && dataManager.getTrades().length > 0;
    const dataStatus = hasData
        ? '✅ I have access to your trading data and can provide personalized analysis.'
        : '⚠️ No trading data found yet. Start logging trades for personalized insights!';

    welcomeDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fa-solid fa-om"></i>
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">Guruji</span>
                <span class="message-time">Now</span>
            </div>
            <div class="message-text">
                <p>🙏 Namaste, fellow trader!</p>
                <p>I am <strong>Guruji</strong>, your AI trading mentor. I'm here to help you with:</p>
                <ul>
                    <li>📊 <strong>Analyzing your actual trading data</strong> - I can see your trades!</li>
                    <li>🧠 Trading psychology and discipline</li>
                    <li>📈 Technical analysis concepts</li>
                    <li>⚖️ Risk management strategies</li>
                    <li>📝 Performance review and improvement</li>
                </ul>
                <p>${dataStatus}</p>
                <p>Ask me to analyze your trades, review your performance, or seek guidance on your trading journey. 🚀</p>
            </div>
        </div>
    `;
    messagesContainer.appendChild(welcomeDiv);
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant typing-indicator';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fa-solid fa-om"></i>
        </div>
        <div class="message-content">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Hide typing indicator
 */
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

/**
 * Update send button state
 */
function updateSendButton() {
    const sendBtn = document.getElementById('send-btn');
    if (isLoading) {
        sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        sendBtn.disabled = true;
    } else {
        sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
        sendBtn.disabled = false;
    }
}

/**
 * Auto-resize textarea
 */
function autoResizeTextarea() {
    const textarea = document.getElementById('chat-input');
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

/**
 * Handle keyboard events
 */
function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// ============================================================================
// PERSISTENCE
// ============================================================================

/**
 * Save chat history to localStorage
 */
function saveChatHistory() {
    localStorage.setItem('guruji_chat_history', JSON.stringify(conversationHistory));
}

/**
 * Load chat history from localStorage
 */
function loadChatHistory() {
    const saved = localStorage.getItem('guruji_chat_history');
    if (saved) {
        try {
            conversationHistory = JSON.parse(saved);

            // Rebuild UI from history
            conversationHistory.forEach(msg => {
                addMessageToUI(msg.role, msg.content);
            });
        } catch (e) {
            console.error('Error loading chat history:', e);
            conversationHistory = [];
            addWelcomeMessage();
        }
    } else {
        addWelcomeMessage();
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format markdown to HTML (basic implementation)
 */
function formatMarkdown(text) {
    // Escape HTML first
    let html = escapeHtml(text);

    // Bold: **text** or __text__
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Code: `code`
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^### (.*?)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.*?)$/gm, '<h2>$1</h2>');

    // Lists
    html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*?<\/li>\n?)+/g, '<ul>$&</ul>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<')) {
        html = '<p>' + html + '</p>';
    }

    return html;
}
