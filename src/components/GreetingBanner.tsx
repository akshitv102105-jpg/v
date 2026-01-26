import React, { useState, useEffect, useMemo } from 'react';

interface GreetingBannerProps {
    nickname: string;
    rank?: { name: string; color: string; shadow: string };
    userProfile?: any;
}

const QUOTES = [
    "The market is a device for transferring money from the impatient to the patient. – Warren Buffett",
    "If you don't know who you are, the stock market is a very expensive place to find out. – George Goodman",
    "Win or lose, everybody gets what they want out of the market. – Ed Seykota",
    "The goal of a successful trader is to make the best trades. Money is secondary. – Alexander Elder",
    "Pride is a luxury a trader cannot afford. – Mark Douglas",
    "Emotional control is the most essential ingredient of successful trading. – Victor Sperandeo",
    "The hardest thing in trading is not the math; it’s the person sitting in the chair.",
    "A peak performance trader is totally committed to being the best and doing whatever it takes to be the best. – Van K. Tharp",
    "Confidence is not 'I will make money on this trade.' Confidence is 'I will be fine if I don't.'",
    "Your goal is not to predict the future, but to react to what the market is telling you.",
    "It’s not whether you’re right or wrong that’s important, but how much money you make when you’re right and how much you lose when you’re wrong. – George Soros",
    "The elements of good trading are: (1) cutting losses, (2) cutting losses, and (3) cutting losses. – Ed Seykota",
    "If you can't take a small loss, sooner or later you will take the mother of all losses. – Ed Seykota",
    "Losers average losers. – Paul Tudor Jones",
    "In trading, you have to be defensive. If you don't, you won't be around. – Paul Tudor Jones",
    "Don't focus on making money; focus on protecting what you have. – Paul Tudor Jones",
    "Risk comes from not knowing what you're doing. – Warren Buffett",
    "He who fights and runs away, lives to fight another day. – Adage",
    "The most important rule of trading is to play great defense, not great offense. – Paul Tudor Jones",
    "Hope is a four-letter word in trading.",
    "Markets are never wrong – opinions often are. – Jesse Livermore",
    "The market can stay irrational longer than you can stay solvent. – John Maynard Keynes",
    "What is comfortable is rarely profitable. – Robert Arnott",
    "The trend is your friend until the end when it bends. – Ed Seykota",
    "Anticipate the anticipation. – Paul Tudor Jones",
    "Every trader has strengths and weaknesses. Some are good at being right, but they have to learn how to be wrong. – Victor Sperandeo",
    "There is no single market secret to discover, no single correct way to trade. – Jack Schwager",
    "Investing is the intersection of economics and psychology. – Seth Klarman",
    "The desire for constant action irrespective of underlying conditions is responsible for many losses. – Jesse Livermore",
    "Everything you need to know is right there in front of you.",
    "Trade what you see, not what you think.",
    "Patterns don't work 100% of the time. But they don't need to. – Mark Douglas",
    "Do more of what works and less of what doesn't. – Steve Clark",
    "If most traders would learn to sit on their hands 50% of the time, they would make a lot more money. – Bill Lipschutz",
    "Trading is 10% execution and 90% waiting.",
    "A lot of people want the prize without the process.",
    "Sheer will and determination are no substitutes for a sound plan.",
    "If you can’t measure it, you can’t manage it. – Peter Drucker",
    "Success in trading comes from having an edge and the discipline to execute it.",
    "The stock market is a giant distraction to the business of investing. – John Bogle",
    "You don't need to know what is going to happen next in order to make money. – Mark Douglas",
    "The market doesn't know you exist.",
    "Successful trading is about the math, not the myth.",
    "Trading is the hardest way to make easy money.",
    "Ego is the enemy. – Ryan Holiday",
    "The market has no memory of your last trade.",
    "I always laugh at people who say 'I've never met a rich technician.' I used fundamentals for 9 years and got rich as a technician. – Marty Schwartz",
    "Be fearful when others are greedy and greedy when others are fearful. – Warren Buffett",
    "Focus on the process, not the outcome.",
    "You have to be willing to be wrong to be right."
];

const GreetingBanner: React.FC<GreetingBannerProps> = ({ nickname, rank, userProfile }) => {
    // ... existing logic ...
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Good Morning";
        if (hour >= 12 && hour < 17) return "Good Afternoon";
        if (hour >= 17 && hour < 21) return "Good Evening";
        return "Good Night";
    };

    const [greeting, setGreeting] = useState(getGreeting());
    const [quote, setQuote] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setGreeting(getGreeting());
        }, 60000 * 30);
        return () => clearInterval(interval);
    }, []);

    // Quote Rotation
    useEffect(() => {
        const rotateQuote = () => {
            const randomIndex = Math.floor(Math.random() * QUOTES.length);
            setQuote(QUOTES[randomIndex]);
        };

        rotateQuote(); // Initial pick
        const interval = setInterval(rotateQuote, 300000); // Rotate every 5 minutes
        return () => clearInterval(interval);
    }, []);

    // Aggressive Rank Styles
    const getRankStyles = (rankName: string) => {
        switch (rankName.toUpperCase()) {
            case 'GOD':
                return {
                    text: 'font-[900] italic tracking-tighter animate-celestial-pulse scale-150',
                    aura: 'opacity-60 blur-[100px] scale-[3]',
                    glow: 'shadow-[0_0_50px_rgba(168,85,247,0.8)]',
                    ring: 'border-purple-500'
                };
            case 'ELITE':
                return {
                    text: 'font-black tracking-widest animate-glitch scale-125',
                    aura: 'opacity-50 blur-[80px] scale-[2.5]',
                    glow: 'shadow-[0_0_40px_rgba(244,63,94,0.6)]',
                    ring: 'animate-pulse border-rose-500'
                };
            case 'WARRIOR':
                return {
                    text: 'font-extrabold uppercase animate-slash scale-110',
                    aura: 'opacity-40 blur-[60px] scale-[2]',
                    glow: 'shadow-[0_0_30px_rgba(251,191,36,0.5)]',
                    ring: 'animate-ping-slow border-amber-400'
                };
            case 'CONSISTENT':
                return {
                    text: 'font-bold animate-float',
                    aura: 'opacity-30 blur-[50px] scale-150',
                    glow: 'shadow-[0_0_20px_rgba(52,211,153,0.4)]',
                    ring: 'animate-pulse border-emerald-400'
                };
            default:
                return {
                    text: 'font-medium',
                    aura: 'opacity-20 blur-[40px]',
                    glow: '',
                    ring: 'border-slate-500'
                };
        }
    };

    const styles = rank ? getRankStyles(rank.name) : null;

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative">
            <style>{`
                @keyframes celestial-pulse {
                    0%, 100% { transform: scale(1.5); text-shadow: 0 0 20px rgba(168,85,247,0.8), 0 0 40px rgba(168,85,247,0.4); }
                    50% { transform: scale(1.6); text-shadow: 0 0 40px rgba(168,85,247,1), 0 0 80px rgba(168,85,247,0.6); }
                }
                @keyframes glitch {
                    0% { transform: scale(1.25) translate(0); }
                    20% { transform: scale(1.25) translate(-2px, 2px); }
                    40% { transform: scale(1.25) translate(-2px, -2px); }
                    60% { transform: scale(1.25) translate(2px, 2px); }
                    80% { transform: scale(1.25) translate(2px, -2px); }
                    100% { transform: scale(1.25) translate(0); }
                }
                @keyframes slash {
                    0% { opacity: 0.5; transform: skewX(-20deg) scale(1.1); }
                    50% { opacity: 1; transform: skewX(0deg) scale(1.2); }
                    100% { opacity: 0.5; transform: skewX(20deg) scale(1.1); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes spin-fast { from { transform: rotate(0deg); } to { transform: rotate(720deg); } }
                @keyframes vortex {
                    from { transform: rotate(0deg) scale(1); }
                    to { transform: rotate(360deg) scale(1.1); }
                }
                @keyframes drift {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(-10px, 10px); }
                }
                .animate-celestial-pulse { animation: celestial-pulse 2s infinite ease-in-out; }
                .animate-glitch { animation: glitch 0.2s infinite; }
                .animate-slash { animation: slash 1s infinite alternate; }
                .animate-float { animation: float 3s infinite ease-in-out; }
                .animate-spin-slow { animation: spin-slow 15s linear infinite; }
                .animate-spin-fast { animation: spin-fast 1s linear infinite; }
                .animate-vortex { animation: vortex 20s linear infinite; }
                .animate-drift { animation: drift 5s ease-in-out infinite; }
                .animate-ping-slow { animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite; }
                
                .galaxy-bg {
                    background: radial-gradient(circle at center, rgba(168, 85, 247, 0.2) 0%, transparent 70%);
                }
                .vortex-layer {
                    position: absolute;
                    inset: -40px;
                    background-image: conic-gradient(from 0deg, transparent, rgba(168, 85, 247, 0.3), transparent 30%, rgba(139, 92, 246, 0.4), transparent);
                    filter: blur(20px);
                    border-radius: 50%;
                }
                .vortex-particles {
                    position: absolute;
                    inset: -20px;
                    background-image: radial-gradient(1px 1px at 20% 30%, #fff 50%, transparent),
                                      radial-gradient(1px 1px at 70% 60%, #fff 50%, transparent),
                                      radial-gradient(1.5px 1.5px at 40% 80%, rgba(167, 139, 250, 0.8) 50%, transparent),
                                      radial-gradient(1px 1px at 10% 10%, #fff 50%, transparent),
                                      radial-gradient(2px 2px at 90% 90%, rgba(168, 85, 247, 0.6) 50%, transparent);
                    background-size: 80px 80px;
                    opacity: 0.4;
                }
            `}</style>

            <div className="flex-1 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">System Online</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight">
                    {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">{nickname}</span>
                </h1>

                {rank && (
                    <div className="mb-4">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mr-2">Trader's Ranking:</span>
                        <span className={`text-lg font-black italic tracking-wider ${rank.color} drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]`}>{rank.name}</span>
                    </div>
                )}

                <div className="max-w-2xl">
                    <p className="text-sm md:text-base text-slate-400 italic font-medium leading-relaxed opacity-80">
                        <i className="fa-solid fa-quote-left text-[10px] text-indigo-500 mr-2 opacity-50"></i>
                        {quote}
                        <i className="fa-solid fa-quote-right text-[10px] text-indigo-500 ml-2 opacity-50"></i>
                    </p>
                </div>
            </div>

            {/* Premium Rank Widget */}
            {rank && styles && (
                <div className="relative flex flex-col items-center justify-center p-8 min-w-[220px] group cursor-default z-20">

                    {/* GOD Rank Galaxy Vortex Special Effect */}
                    {rank.name === 'GOD' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="absolute w-[280px] h-[280px] galaxy-bg animate-pulse"></div>
                            <div className="vortex-layer animate-vortex"></div>
                            <div className="vortex-layer animate-vortex opacity-60" style={{ animationDuration: '10s', animationDirection: 'reverse', inset: '-60px' }}></div>
                            <div className="vortex-layer animate-spin-slow opacity-30" style={{ animationDuration: '40s', inset: '-20px', backgroundImage: 'conic-gradient(from 180deg, transparent, rgba(168, 85, 247, 0.4), transparent)' }}></div>
                            <div className="vortex-particles animate-drift"></div>
                            <div className="vortex-particles animate-vortex opacity-30" style={{ animationDuration: '30s' }}></div>
                        </div>
                    )}

                    {/* Concentric Aura Layers for others */}
                    {rank.name !== 'GOD' && (
                        <>
                            <div className={`absolute w-32 h-32 rounded-full blur-[40px] opacity-40 animate-pulse ${rank.color.replace('text-', 'bg-')}`}></div>
                            <div className={`absolute w-48 h-48 rounded-full blur-[80px] opacity-20 ${rank.color.replace('text-', 'bg-')}`}></div>
                        </>
                    )}

                    {/* Avatar Container with Glow Ring */}
                    <div className="relative mb-6">
                        {/* Dynamic Swirling Border for GOD */}
                        {rank.name === 'GOD' && (
                            <>
                                <div className="absolute -inset-4 rounded-full opacity-30 blur-xl bg-purple-600 animate-pulse"></div>
                                <div className="absolute -inset-2 rounded-full border border-purple-400/30 animate-spin-slow"></div>
                                <div className="absolute -inset-0.5 rounded-full border-2 border-purple-400/60 shadow-[0_0_15px_rgba(168,85,247,0.8)] z-10"></div>
                            </>
                        )}

                        <div className={`absolute -inset-4 rounded-full opacity-40 blur-md animate-spin-slow ${rank.color.replace('text-', 'bg-gradient-to-tr from-transparent to-')}`}></div>
                        <div className={`relative h-28 w-28 rounded-full border-4 bg-slate-950 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:scale-110 shadow-2xl ${styles.glow} ${styles.ring}`}>
                            {userProfile?.avatarImage ? (
                                <img src={userProfile.avatarImage} alt="Rank" className="h-full w-full object-cover" />
                            ) : (
                                <i className={`fa-solid fa-user-astronaut text-5xl ${rank.color}`}></i>
                            )}
                        </div>
                    </div>

                    {/* Rank Indicator Removed as per request */}
                </div>
            )}
        </div>
    );
};

export default GreetingBanner;
