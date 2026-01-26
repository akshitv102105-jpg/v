
import React, { useEffect, useState } from 'react';
import './RiskRewardAnimation.css';

interface RiskRewardAnimationProps {
    dailyProfit: number;
    dailyGoal: number;
    dailyDD: number;
    maxDailyDD: number;
    tradeCount: number;
    maxTrades: number;
    enabled?: boolean;
}

const RiskRewardAnimation: React.FC<RiskRewardAnimationProps> = ({
    dailyProfit,
    dailyGoal,
    dailyDD,
    maxDailyDD,
    tradeCount,
    maxTrades,
    enabled = true
}) => {
    if (!enabled) return null;

    // Calculate percentages for positions
    // Calculate percentages for positions
    // Hunter (Profit) Position: 0 to 100%
    const hunterPos = dailyGoal > 0
        ? Math.min(Math.max((dailyProfit / dailyGoal) * 100, 0), 100)
        : 0;

    // Tiger (Risk) Position: 0 to 100%
    const tigerPos = maxDailyDD > 0
        ? Math.min(Math.max((dailyDD / maxDailyDD) * 100, 0), 100)
        : 0;

    const isVictory = hunterPos >= 100;
    const isEaten = tigerPos >= 100;
    const isDanger = dailyDD > (maxDailyDD * 0.6) && !isEaten;
    const isCritical = dailyDD > (maxDailyDD * 0.8) && !isEaten;

    // Determine anxiety level
    let anxietyLevel = '';
    if (isEaten) anxietyLevel = 'eaten';
    else if (tigerPos >= 80) anxietyLevel = 'level-4';
    else if (tigerPos >= 60) anxietyLevel = 'level-3';
    else if (tigerPos >= 40) anxietyLevel = 'level-2';
    else if (tigerPos >= 20) anxietyLevel = 'level-1';

    // Calculate CSS left/right positions mapping 0-100% to track width (approx 8% to 92%)
    const minPos = 8;
    const maxPos = 92;
    const hunterLeft = minPos + (hunterPos / 100) * (maxPos - minPos);
    // Tiger moves from right (92%) to left (8%) as risk increases
    const tigerLeft = maxPos - (tigerPos / 100) * (maxPos - minPos);

    return (
        <div className="risk-reward-container">
            <div className="cave-texture"></div>

            <div className="animation-tracks">
                {/* PROFIT TRACK */}
                <div className="animation-track profit-track">
                    <span className="track-label profit">THE HUNT (PROFIT)</span>

                    {/* Treasure Goal */}
                    {/* Treasure Goal */}
                    {!isVictory && (
                        <div className="treasure-goal">
                            <div className="treasure-glow"></div>
                            <div className="treasure-rays">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="treasure-ray"></div>
                                ))}
                            </div>
                            <div className="treasure-icon">
                                <i className="fa-solid fa-gem"></i>
                            </div>
                        </div>
                    )}

                    {/* Running Hunter */}
                    <div className={`hunter-character ${isVictory ? 'victory' : 'running'}`} style={{ left: `${hunterLeft}%` }}>
                        {isVictory && (
                            <>
                                <div className="hunter-trophy" style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
                                    <i className="fa-solid fa-gem text-yellow-400 text-xl animate-bounce"></i>
                                </div>
                                <div className="victory-sparkles">
                                    {[...Array(5)].map((_, i) => <div key={i} className="victory-sparkle"></div>)}
                                </div>
                            </>
                        )}
                        <div className="hunter-body">
                            <div className="hunter-figure">
                                <div className="hunter-icon">
                                    <i className={`fa-solid ${isVictory ? 'fa-person-rays text-yellow-500' : 'fa-person-running'}`}></i>
                                </div>
                            </div>
                            {!isVictory && (
                                <div className="dust-trail">
                                    <div className="dust-cloud"></div>
                                    <div className="dust-cloud"></div>
                                    <div className="dust-cloud"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="track-progress">
                        <div className="track-progress-fill profit" style={{ width: `${hunterPos}%` }}></div>
                    </div>
                </div>

                {/* RISK TRACK */}
                <div className="animation-track risk-track">
                    <span className="track-label risk">THE TIGER (RISK)</span>

                    {/* Anxious Stickman */}
                    <div className={`anxious-man ${anxietyLevel}`}>
                        <div className="anxious-container">
                            <div className="stickman">
                                <div className="stickman-head">
                                    <div className="stickman-eyebrows">
                                        <div className="stickman-eyebrow left"></div>
                                        <div className="stickman-eyebrow right"></div>
                                    </div>
                                    <div className="stickman-eyes">
                                        <div className="stickman-eye"></div>
                                        <div className="stickman-eye"></div>
                                    </div>
                                    <div className="stickman-mouth"></div>
                                    <div className="sweat-drops">
                                        <div className="sweat-drop"></div>
                                        <div className="sweat-drop"></div>
                                        <div className="sweat-drop"></div>
                                    </div>
                                </div>
                                <div className="stickman-body"></div>
                                <div className="stickman-arms">
                                    <div className="stickman-arm left"></div>
                                    <div className="stickman-arm right"></div>
                                </div>
                                <div className="stickman-legs">
                                    <div className="stickman-leg left"></div>
                                    <div className="stickman-leg right"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Skull icon */}
                    <div className={`skull-icon ${isEaten ? 'visible' : ''}`}>
                        <i className="fa-solid fa-skull"></i>
                    </div>

                    {/* Tiger */}
                    <div className={`tiger-character ${isDanger ? 'danger' : ''} ${isEaten ? 'victory-roar' : ''}`} style={{ left: `${tigerLeft}%` }}>
                        <div className="tiger-container">
                            <div className="tiger-glow"></div>
                            <div className="tiger-image-wrapper">
                                <img src="/beast.png" alt="Beast" className="tiger-img" />
                            </div>
                            {!isEaten && (
                                <div className="dust-trail red">
                                    <div className="dust-cloud"></div>
                                    <div className="dust-cloud"></div>
                                    <div className="dust-cloud"></div>
                                </div>
                            )}
                            <div className={`roar-warning ${isCritical ? 'active' : ''}`}>
                                <span className="roar-exclamation">!</span>
                            </div>
                        </div>
                    </div>

                    <div className="track-progress">
                        <div className="track-progress-fill risk" style={{ width: `${tigerPos}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="animation-stats">
                <div className="stat-item">
                    <div className="stat-label">Daily P&L</div>
                    <div className={`stat-value profit ${dailyProfit > 0 ? 'text-green' : dailyProfit < 0 ? 'text-red' : 'neutral'}`}>
                        ${dailyProfit.toFixed(2)}
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-label">Daily Goal</div>
                    <div className="stat-value goal neutral">${dailyGoal.toFixed(0)}</div>
                </div>
                <div className="stat-item">
                    <div className="stat-label">Daily DD</div>
                    <div className={`stat-value risk ${isCritical ? 'text-warning' : ''}`}>{dailyDD.toFixed(1)}%</div>
                </div>
                <div className="stat-item">
                    <div className="stat-label">Max DD</div>
                    <div className="stat-value max-risk neutral">{maxDailyDD}%</div>
                </div>
                <div className="stat-item">
                    <div className="stat-label">Trades</div>
                    <div className="stat-value trade-count neutral">
                        {tradeCount}{maxTrades > 0 ? `/${maxTrades}` : ''}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RiskRewardAnimation;
