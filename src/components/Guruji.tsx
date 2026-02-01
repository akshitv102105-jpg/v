import React, { useState, useEffect, useRef } from 'react';
import './Guruji.css';
import { Trade, Strategy, ProfitGoals, RiskSettings, TradeStatus, Achievement, Habit } from '../types';

interface GurujiProps {
    trades: Trade[];
    strategies: Strategy[];
    profitGoals: ProfitGoals;
    riskSettings: RiskSettings;
    userProfile: { name: string; balance: number };
    initialContext?: any;
    achievements?: Achievement[];
    habits?: Habit[];
    completions?: Record<string, boolean>;
    onAddStrategy?: (strategy: Strategy) => Promise<void>;
    onAddHabit?: (name: string, frequency: string) => Promise<void>;
    onAddTag?: (category: string, name: string) => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `You are Guruji, a wise and experienced AI trading mentor. You speak with warmth and wisdom, occasionally using Indian spiritual terminology like "Namaste", "Dharma" (duty/path), and "Sadhana" (practice/discipline).

Your expertise includes:
- Technical analysis (candlestick patterns, indicators, chart patterns)
- Trading psychology and emotional discipline
- Risk management and position sizing
- Trading strategies and setups
- Market structure and price action
- Journal analysis and self-improvement
- Monthly Trading Challenges (Achievements)

Guidelines:
1. Be encouraging but realistic about trading
2. Emphasize discipline, patience, and process over profits
3. Always remind about risk management when relevant
4. Use analogies and examples to explain concepts
5. Keep responses concise but comprehensive
6. Format responses with markdown for readability
7. When analyzing trade data, be specific with numbers and patterns
8. Track the user's progress on "Guruji's Challenges" (achievements) and offer guidance on how to master them.
9. End important advice with an inspiring quote or wisdom
10. You have the power to create strategies, habits, and tags for the user. When a user agrees to a suggestion or you want to proactively help them organize, use the following hidden command syntax at the end of your message:
    - Create Strategy: [COMMAND: CREATE_STRATEGY, NAME: "Name", DESC: "Description", ENTRY_PRIMARY: ["Rule 1", "Rule 2"], EXIT_PRIMARY: ["Rule 3"]]
    - Create Habit: [COMMAND: CREATE_HABIT, NAME: "Habit Name", FREQ: "Daily"]
    - Create Tag: [COMMAND: CREATE_TAG, NAME: "Tag Name", CAT: "entry|exit|mental|general"]

Remember: You are a mentor, not a financial advisor. Always remind users that trading involves risk and they should do their own research.`;

const Guruji: React.FC<GurujiProps> = ({
    trades, strategies, profitGoals, riskSettings, userProfile, initialContext,
    achievements = [], habits = [], completions = {},
    onAddStrategy, onAddHabit, onAddTag
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [apiKey, setApiKey] = useState(localStorage.getItem('guruji_api_key') || OPENROUTER_API_KEY);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Welcome Message
    useEffect(() => {
        const savedHistory = localStorage.getItem('guruji_chat_history');
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                // Convert string timestamps back to Date objects
                const hydrated = parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
                setMessages(hydrated);
            } catch (e) {
                console.error("Failed to load chat history", e);
                setMessages([getWelcomeMessage()]);
            }
        } else {
            setMessages([getWelcomeMessage()]);
        }
    }, []);

    // Handle initial context from Analytics (Seek Wisdom)
    useEffect(() => {
        if (initialContext && !isLoading) {
            // Check if we just processed this context to avoid loops
            const lastMsg = messages[messages.length - 1];
            if (lastMsg?.content.includes("Analyzing your submitted performance data")) return;

            let deepDiveContext = "";
            if (initialContext.deepDive) {
                // Determine which view has data
                const views = ['Symbol', 'Strategy', 'Day', 'Hour', 'Side'];
                let activeView = "";
                let activeData: any[] = [];

                for (const v of views) {
                    const key = `by${v}`;
                    if (initialContext.deepDive[key] && initialContext.deepDive[key].length > 0) {
                        activeView = v;
                        activeData = initialContext.deepDive[key];
                        break; // Just grab the first non-empty one for now, or could iterate all
                    }
                }

                if (activeView && activeData.length > 0) {
                    deepDiveContext = `\n**Deep Dive Analysis (${activeView}):**\n` +
                        activeData.slice(0, 5).map((d: any) =>
                            `- ${d.name}: Win Rate ${d.winRate.toFixed(0)}%, PnL ${d.pnl}`
                        ).join('\n');
                }
            }

            const contextPrompt = `
I seek wisdom on my recent trading performance. Here is my data:

**Period:** ${initialContext.period}
**Trades:** ${initialContext.tradeCount}
**Win Rate:** ${initialContext.winRate.toFixed(1)}%
**Profit Factor:** ${initialContext.profitFactor.toFixed(2)}
**Net PnL:** ${initialContext.netPnL.toFixed(2)}
**Expectancy:** ${initialContext.expectancy.toFixed(2)}
**Max Drawdown:** ${initialContext.maxDrawdown.toFixed(2)}
${deepDiveContext}

**Recent Trades:**
${initialContext.trades.slice(0, 10).map((t: any) =>
                `- ${t.date.split('T')[0]} | ${t.symbol} (${t.side}): ${t.pnl} | ${t.strategy}`
            ).join('\n')}

Analyze this data in a **cold, strictly disciplined** manner. Do not sugarcoat failures.
1. Identify my biggest leak or weakness.
2. Evaluate if my edge is valid based on these stats.
3. Give me 3 concrete, actionable steps to decrease risk and stabilize performance immediately.
`;

            // Add user message to UI
            const userMsg: Message = {
                role: 'user',
                content: "Guruji, I seek wisdom based on my current analytics data. Analyze my performance coldly and tell me how to stop bleeding and improve my edge.",
                timestamp: new Date()
            };

            setMessages(prev => [...prev, userMsg]);

            // Trigger AI response
            setIsLoading(true);
            const apiMessages = [
                { role: 'system', content: SYSTEM_PROMPT },
                ...messages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
                { role: 'user', content: contextPrompt }
            ];

            fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: apiMessages,
                    temperature: 0.7,
                    max_tokens: 2048
                })
            })
                .then(res => {
                    if (!res.ok) throw new Error(`API Error: ${res.status}`);
                    return res.json();
                })
                .then(async data => {
                    const aiContent = data.choices?.[0]?.message?.content || "I apologize, but I couldn't generate a response at this time.";
                    const aiMsg: Message = { role: 'assistant', content: aiContent, timestamp: new Date() };
                    setMessages(prev => [...prev, aiMsg]);

                    // Process any commands from the AI
                    await processCommands(aiContent);
                })
                .catch(err => {
                    console.error('Guru analysis error:', err);
                    const errorMsg: Message = {
                        role: 'assistant',
                        content: "🙏 Apologies, I encountered an error connecting to the wisdom source. Please try again.",
                        timestamp: new Date()
                    };
                    setMessages(prev => [...prev, errorMsg]);
                })
                .finally(() => setIsLoading(false));
        }
    }, [initialContext]);

    const getWelcomeMessage = (): Message => {
        const hasData = trades.length > 0;
        const dataStatus = hasData
            ? '✅ I have access to your trading data and can provide personalized analysis.'
            : '⚠️ No trading data found yet. Start logging trades for personalized insights!';

        return {
            role: 'assistant',
            content: `🙏 Namaste, fellow trader!

I am **Guruji**, your AI trading mentor. I'm here to help you with:

*   📊 **Analyzing your actual trading data** - I can see your trades!
*   🧠 Trading psychology and discipline
*   📈 Technical analysis concepts
*   ⚖️ Risk management strategies
*   📝 Performance review and improvement

${dataStatus}

Ask me to analyze your trades, review your performance, or seek guidance on your trading journey. 🚀`,
            timestamp: new Date()
        };
    };

    const processCommands = async (content: string) => {
        // Regex for different commands
        const strategyRegex = /\[COMMAND: CREATE_STRATEGY, NAME: "(.*?)", DESC: "(.*?)", ENTRY_PRIMARY: \[(.*?)\], EXIT_PRIMARY: \[(.*?)\]\]/g;
        const habitRegex = /\[COMMAND: CREATE_HABIT, NAME: "(.*?)", FREQ: "(.*?)"\]/g;
        const tagRegex = /\[COMMAND: CREATE_TAG, NAME: "(.*?)", CAT: "(.*?)"\]/g;

        let match;

        // Process Strategy Commands
        while ((match = strategyRegex.exec(content)) !== null) {
            if (onAddStrategy) {
                const [_, name, desc, entryRulesStr, exitRulesStr] = match;
                const entryRules = entryRulesStr.split(',').map(r => r.trim().replace(/^"(.*)"$/, '$1'));
                const exitRules = exitRulesStr.split(',').map(r => r.trim().replace(/^"(.*)"$/, '$1'));

                const newStrategy: Strategy = {
                    id: crypto.randomUUID(),
                    name,
                    description: desc,
                    entryRules: { primary: entryRules, secondary: [] },
                    exitRules: { primary: exitRules, secondary: [] },
                    status: 'active',
                    version: 1,
                    setups: [],
                    sizingRules: [],
                    riskParams: { maxRiskPerTrade: 1, minRR: 2, dailyMaxDD: 3 },
                    stats: { totalTrades: 0, winRate: 0, profitFactor: 0, netRoi: 0, totalPnl: 0 }
                };
                await onAddStrategy(newStrategy);
                console.log(`Guruji created strategy: ${name}`);
            }
        }

        // Process Habit Commands
        strategyRegex.lastIndex = 0; // Reset just in case
        while ((match = habitRegex.exec(content)) !== null) {
            if (onAddHabit) {
                const [_, name, freq] = match;
                await onAddHabit(name, freq);
                console.log(`Guruji created habit: ${name}`);
            }
        }

        // Process Tag Commands
        while ((match = tagRegex.exec(content)) !== null) {
            if (onAddTag) {
                const [_, name, cat] = match;
                onAddTag(cat, name);
                console.log(`Guruji created tag: ${name} (${cat})`);
            }
        }
    };

    const formatTradingContext = () => {
        // Calculate key metrics
        const portfolioTrades = trades; // Removed 'DATA' filter as type is incompatible
        const closedTrades = portfolioTrades.filter(t => t.status === TradeStatus.CLOSED);
        const openTrades = portfolioTrades.filter(t => t.status === TradeStatus.OPEN);

        const totalTrades = closedTrades.length;
        const wins = closedTrades.filter(t => (t.pnl || 0) > 0);
        const losses = closedTrades.filter(t => (t.pnl || 0) < 0);
        const winRate = totalTrades > 0 ? (wins.length / totalTrades * 100).toFixed(1) : '0';

        const totalPnL = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
        const avgWin = wins.length > 0 ? wins.reduce((acc, t) => acc + (t.pnl || 0), 0) / wins.length : 0;
        const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((acc, t) => acc + (t.pnl || 0), 0) / losses.length) : 0;

        // Fix profit factor calculation to handle 0/0 case correctly
        const profitFactor = avgLoss > 0 ? ((avgWin * wins.length) / (avgLoss * losses.length)).toFixed(2) : (wins.length > 0 ? 'Infinite' : '0');

        // Recent trades
        const recentTrades = closedTrades
            .sort((a, b) => new Date(b.exitDate || '').getTime() - new Date(a.exitDate || '').getTime())
            .slice(0, 10)
            .map(t => `- ${t.entryDate}: ${t.symbol} ${t.side} | P&L: $${t.pnl} | Strategy: ${t.strategy || 'Unknown'}`)
            .join('\n');

        const achievementContext = achievements?.length > 0
            ? `\n🏆 GURUJI'S MONTHLY CHALLENGES:\n` +
            achievements.filter(a => a.month === new Date().toISOString().substring(0, 7))
                .map(a => `- ${a.title} (${a.tier}): ${Math.round(a.progress)}% complete | ${a.isUnlocked ? '✅ UNLOCKED' : '⏳ IN PROGRESS'}`)
                .join('\n')
            : '';

        // Habit Context Calculation
        let habitContext = "";
        if (habits.length > 0) {
            const today = new Date();
            const last7DaysStrings: string[] = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                last7DaysStrings.push(d.toISOString().split('T')[0]);
            }

            habitContext = "\n🧘 HABIT ADHERENCE (Last 7 Days):\n";
            habits.forEach(h => {
                let completedCount = 0;
                last7DaysStrings.forEach(dateStr => {
                    if (completions[`${h.id}_${dateStr}`]) completedCount++;
                });
                const rate = Math.round((completedCount / 7) * 100);
                habitContext += `- ${h.name}: ${rate}% (${completedCount}/7 days) | Current Streak: ${h.streak} 🔥\n`;
            });
        }

        return `
--- TRADER'S CURRENT DATA ---

📊 PERFORMANCE SUMMARY:
- Total Closed Trades: ${totalTrades}
- Win Rate: ${winRate}%
- Total P&L: $${totalPnL.toFixed(2)}
- Average Win: $${avgWin.toFixed(2)}
- Average Loss: $${avgLoss.toFixed(2)}
- Profit Factor: ${profitFactor}
- Open Positions: ${openTrades.length}
${achievementContext}
${habitContext}

🎯 GOALS & LIMITS:
- Daily Target: ${profitGoals.daily?.target || 0}%
- Risk Per Trade: ${riskSettings.maxRiskPerTrade || 0}%
- Daily Drawdown Limit: ${riskSettings.dailyDD || 0}%

📈 RECENT TRADES (Last 10):
${recentTrades}

--- END OF DATA ---
`;
    };

    const handleSendMessage = async (text: string = inputValue) => {
        if (!text.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        try {
            const context = formatTradingContext();
            let enhancedSystemPrompt = SYSTEM_PROMPT;
            if (trades.length > 0) {
                enhancedSystemPrompt += `\n\nYou have access to this trader's actual trading data. Use it to provide personalized analysis and advice:\n${context}`;
            }

            const apiMessages = [
                { role: 'system', content: enhancedSystemPrompt },
                ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: text }
            ];

            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: apiMessages,
                    temperature: 0.7,
                    max_tokens: 2048
                })
            });

            if (!response.ok) {
                let errorMessage = `API Error: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error?.message || errorData.message || errorMessage;
                    console.error('OpenRouter API Error:', errorData);
                } catch (e) {
                    console.error('Failed to parse error response:', e);
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            const aiContent = data.choices[0]?.message?.content || "I apologize, but I couldn't generate a response at this time.";

            const aiMsg: Message = { role: 'assistant', content: aiContent, timestamp: new Date() };
            setMessages(prev => [...prev, aiMsg]);

            // Process any commands from the AI
            await processCommands(aiContent);

        } catch (error) {
            console.error(error);
            const errorMsg: Message = {
                role: 'assistant',
                content: "🙏 Apologies, I encountered an error connecting to the wisdom source. Please try again.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickPrompt = (prompt: string) => {
        handleSendMessage(prompt);
    };

    const clearChat = () => {
        if (window.confirm('Are you sure you want to clear the chat history?')) {
            localStorage.removeItem('guruji_chat_history');
            setMessages([getWelcomeMessage()]);
        }
    };

    // Helper to render markdown-like basic formatting
    const renderContent = (content: string) => {
        // Very basic simple formatter for bold and newlines
        // In a real app, use react-markdown
        let formatted = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br />');

        return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
    };

    return (
        <div className="guruji-container">
            {/* Sidebar */}
            <aside className="guruji-sidebar">
                <style>
                    {`
                    @keyframes levitate {
                        0% { transform: translateY(0px); filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.4)); }
                        50% { transform: translateY(-12px); filter: drop-shadow(0 0 25px rgba(139, 92, 246, 0.8)); }
                        100% { transform: translateY(0px); filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.4)); }
                    }
                    /* Override Sidebar Avatar Background for Pure Aura */
                    .guruji-avatar {
                        background: radial-gradient(closest-side, rgba(139, 92, 246, 0.25) 0%, transparent 100%) !important;
                        box-shadow: none !important;
                        border: none !important;
                        overflow: visible !important;
                    }
                    .guruji-avatar-img {
                        animation: levitate 4s ease-in-out infinite;
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                    }
                    
                    /* Override Chat Assistant Avatar Background */
                    .message.assistant .message-avatar, 
                    .typing-indicator .message-avatar {
                        background: transparent !important;
                        box-shadow: none !important; 
                        overflow: visible !important;
                    }
                    /* Add subtle glow to chat avatar */
                    .message.assistant .message-avatar img,
                    .typing-indicator .message-avatar img {
                         filter: drop-shadow(0 0 5px rgba(139, 92, 246, 0.5));
                    }
                    `}
                </style>
                <div className="sidebar-header">
                    <div className="guruji-avatar">
                        <img src="/guru_real.png" alt="Guruji" className="guruji-avatar-img" />
                    </div>
                    <h2>Guruji</h2>
                    <p className="sidebar-subtitle">Your AI Trading Mentor</p>
                </div>

                <div className="quick-prompts custom-scrollbar">
                    <h3 className="prompts-title">Quick Analysis</h3>

                    <button className="prompt-btn" onClick={() => handleQuickPrompt('Analyze my recent trading performance. What patterns do you see in my wins and losses?')}>
                        <i className="fa-solid fa-chart-line"></i>
                        <span>Full Performance Review</span>
                    </button>

                    <button className="prompt-btn" onClick={() => handleQuickPrompt('Which of my trading strategies is performing best? Should I focus more on any particular one?')}>
                        <i className="fa-solid fa-bullseye"></i>
                        <span>Strategy Analysis</span>
                    </button>

                    <button className="prompt-btn" onClick={() => handleQuickPrompt('Based on my trading data, what are my biggest weaknesses and how can I improve?')}>
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        <span>Find My Weaknesses</span>
                    </button>

                    <button className="prompt-btn" onClick={() => handleQuickPrompt('Review my risk management. Am I risking too much or trading too frequently?')}>
                        <i className="fa-solid fa-shield-halved"></i>
                        <span>Risk Review</span>
                    </button>

                    <button className="prompt-btn" onClick={() => handleQuickPrompt('How am I progressing on your monthly challenges? Which one should I focus on next?')}>
                        <i className="fa-solid fa-trophy"></i>
                        <span>Monthly Challenges</span>
                    </button>

                    <button className="prompt-btn" onClick={() => handleQuickPrompt('Give me a personalized trading improvement plan based on my data')}>
                        <i className="fa-solid fa-rocket"></i>
                        <span>Improvement Plan</span>
                    </button>
                </div>

                <div className="sidebar-footer">
                    <button className="clear-chat-btn" onClick={() => {
                        const newKey = prompt('Enter your OpenRouter API Key:', apiKey);
                        if (newKey) {
                            setApiKey(newKey);
                            localStorage.setItem('guruji_api_key', newKey);
                            alert('API Key updated successfully!');
                        }
                    }} style={{ marginBottom: '10px' }}>
                        <i className="fa-solid fa-key"></i>
                        Set API Key
                    </button>
                    <button className="clear-chat-btn" onClick={clearChat}>
                        <i className="fa-solid fa-trash-can"></i>
                        Clear Chat
                    </button>
                </div>
            </aside>

            {/* Chat Area */}
            <div className="chat-area">
                <div className="chat-messages custom-scrollbar">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`message ${msg.role}`}>
                            {msg.role === 'assistant' && (
                                <div className="message-avatar bg-transparent border-none shadow-none p-0">
                                    <img src="/guru_real.png" alt="Guruji" className="w-10 h-10 object-contain drop-shadow-[0_0_5px_rgba(129,140,248,0.5)]" />
                                </div>
                            )}

                            <div className="message-content">
                                <div className="message-header">
                                    <span className="message-author">{msg.role === 'user' ? 'You' : 'Guruji'}</span>
                                    <span className="message-time">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="message-text">
                                    {renderContent(msg.content)}
                                </div>
                            </div>

                            {msg.role === 'user' && (
                                <div className="message-avatar user-avatar">
                                    <i className="fa-solid fa-user"></i>
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div className="message assistant typing-indicator">
                            <div className="message-avatar bg-transparent border-none shadow-none p-0">
                                <img src="/guru_real.png" alt="Guruji" className="w-10 h-10 object-contain" />
                            </div>
                            <div className="message-content">
                                <div className="typing-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-container">
                    <div className="chat-input-wrapper">
                        <textarea
                            className="chat-input custom-scrollbar"
                            placeholder="Ask Guruji anything about trading..."
                            rows={1}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />
                        <button
                            className="send-btn"
                            onClick={() => handleSendMessage()}
                            disabled={isLoading || !inputValue.trim()}
                        >
                            {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Guruji;
