/**
 * Risk Reward Animation JavaScript
 * Hunter chasing treasure, Tiger hunting anxious trader
 */

class RiskRewardAnimation {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.hunterPos = 0;
        this.tigerPos = 0;

        // Data from Profit Goals and Risk Status
        this.dailyProfit = 0;
        this.dailyGoal = 0;
        this.dailyDD = 0;
        this.maxDailyDD = 5;
        this.todayTradeCount = 0;
        this.maxTradesPerDay = 0;

        this.init();
    }

    init() {
        if (!this.container) {
            console.warn('RiskRewardAnimation: Container not found');
            return;
        }

        this.render();

        setTimeout(() => {
            this.loadData();
            this.updateUI();
        }, 200);

        // Update every 3 seconds
        setInterval(() => {
            this.loadData();
            this.updateUI();
        }, 3000);
    }

    loadData() {
        try {
            // Strategy: Read values from the DOM that script.js has already computed
            // This ensures we are synced with what the user sees on the dashboard

            const progressSections = document.querySelectorAll('.progress-section');

            // 1. Get Daily Profit & Goal (Index 0 is Daily Target)
            if (progressSections.length > 0) {
                const dailyProfitSection = progressSections[0];
                const label = dailyProfitSection.querySelector('.progress-label');

                if (label && label.textContent.includes('Daily')) {
                    // Script.js updates the bottom spans with current/target values
                    // Look for the div with justify-content: space-between
                    const bottomValuesDiv = dailyProfitSection.querySelector('div[style*="justify-content: space-between"]');
                    if (bottomValuesDiv) {
                        const spans = bottomValuesDiv.querySelectorAll('span');
                        if (spans.length >= 2) {
                            // First span is Current P&L (e.g., "$125.00" or "-$50.00")
                            let pnlText = spans[0].textContent;
                            // Clean up currency symbols and commas
                            let pnlVal = parseFloat(pnlText.replace(/[$,]/g, ''));
                            if (!isNaN(pnlVal)) {
                                this.dailyProfit = pnlVal;
                            }

                            // Second span is Target (e.g., "$250")
                            let targetText = spans[1].textContent;
                            let targetVal = parseFloat(targetText.replace(/[$,]/g, ''));
                            if (!isNaN(targetVal)) {
                                this.dailyGoal = targetVal;
                            }
                        }
                    }
                }
            }

            // 2. Get Daily Drawdown (Index 3 is Risk Status -> Daily DD)
            // We search for the section with "Daily DD" label to be safe
            let foundRisk = false;
            progressSections.forEach(section => {
                const label = section.querySelector('.progress-label');
                if (label && label.textContent.includes('Daily DD')) {
                    const valueEl = section.querySelector('.progress-value');
                    if (valueEl) {
                        // Format: "0.05% / 5%"
                        const text = valueEl.textContent;
                        const match = text.match(/([\d\.]+)%\s*\/\s*([\d\.]+)%/);
                        if (match) {
                            this.dailyDD = parseFloat(match[1]);
                            this.maxDailyDD = parseFloat(match[2]);
                            foundRisk = true;
                        }
                    }
                }
            });

            // Fallback if DOM reading fails
            if (this.dailyGoal === 0 && typeof dataManager !== 'undefined') {
                // ... existing fallback code ...
                const profitGoals = dataManager.getProfitGoals();
                if (profitGoals && profitGoals.daily) {
                    this.dailyGoal = profitGoals.daily.target || 100;
                }
            }

            // Fallback: If we have a loss but DOM shows 0% DD (maybe script.js hasn't updated yet)
            // recalculate DD manually based on the Profit we just read
            if ((!foundRisk || this.dailyDD === 0) && this.dailyProfit < 0) {
                // Assume a default balance if we can't get it, or try to get it
                // But for animation purposes, we can rely on relative loss
                // DD = (Abs(Loss) / (StartingBalance)) * 100
                // We don't know StartingBalance easily from DOM alone without more parsing
                // But we can estimate or use a dataManager call if available

                if (typeof calculatePortfolioBalance === 'function' && typeof dataManager !== 'undefined') {
                    const tx = dataManager.getTransactions();
                    const trades = dataManager.getTrades();
                    // Filter out data trades
                    const realTrades = trades.filter(t => t.tradeType !== 'DATA');
                    const balance = calculatePortfolioBalance(tx, realTrades);

                    // Starting balance for today
                    const startingBalance = balance - this.dailyProfit;
                    if (startingBalance > 0) {
                        this.dailyDD = (Math.abs(this.dailyProfit) / startingBalance) * 100;
                    }
                }
            }

            this.updatePositions();

        } catch (e) {
            console.error('RiskRewardAnimation: Error loading data', e);
        }
    }



    updatePositions() {
        // Profit Progress (0 to 100%)
        const profitPct = this.dailyGoal > 0
            ? Math.min(Math.max((this.dailyProfit / this.dailyGoal) * 100, 0), 100) : 0;
        this.hunterPos = profitPct;

        // Risk Progress (0 to 100%)
        const riskPct = this.maxDailyDD > 0
            ? Math.min(Math.max((this.dailyDD / this.maxDailyDD) * 100, 0), 100) : 0;
        this.tigerPos = riskPct;
    }

    updateUI() {
        if (!this.container) return;

        // === PROFIT TRACK ===
        const hunterProgress = this.container.querySelector('.track-progress-fill.profit');
        if (hunterProgress) {
            hunterProgress.style.width = `${this.hunterPos}%`;
        }

        const hunter = this.container.querySelector('.hunter-character');
        const treasure = this.container.querySelector('.treasure-goal');
        const isVictory = this.hunterPos >= 100;

        if (hunter) {
            const minPos = 8;
            const maxPos = 92;
            const hunterLeft = minPos + (this.hunterPos / 100) * (maxPos - minPos);
            hunter.style.left = `${hunterLeft}%`;
            // Always run unless victory (Hunt is always on!)
            hunter.classList.toggle('running', !isVictory);
            hunter.classList.toggle('victory', isVictory);
        }

        if (treasure) {
            treasure.classList.toggle('captured', isVictory);
        }

        const dustTrail = this.container.querySelector('.dust-trail');
        if (dustTrail) {
            // Show air flow/dust trail always when running
            dustTrail.style.display = (!isVictory) ? 'flex' : 'none';
        }

        // === RISK TRACK ===
        const riskProgress = this.container.querySelector('.track-progress-fill.risk');
        if (riskProgress) {
            riskProgress.style.width = `${this.tigerPos}%`;
        }

        const isEaten = this.tigerPos >= 100;

        const tiger = this.container.querySelector('.tiger-character');
        if (tiger) {
            const maxPos = 92;
            const minPos = 8;
            const tigerLeft = maxPos - (this.tigerPos / 100) * (maxPos - minPos);
            tiger.style.left = `${tigerLeft}%`;

            const isDanger = this.dailyDD > (this.maxDailyDD * 0.6);
            tiger.classList.toggle('danger', isDanger && !isEaten);
            tiger.classList.toggle('victory-roar', isEaten);

            const tigerDust = tiger.querySelector('.dust-trail');
            if (tigerDust) {
                // Show dust trail unless eaten (victory roar)
                tigerDust.style.display = (!isEaten) ? 'flex' : 'none';
            }
        }

        // Update anxious stickman based on risk level
        const anxiousMan = this.container.querySelector('.anxious-man');
        if (anxiousMan) {
            // Remove all level classes
            anxiousMan.classList.remove('level-1', 'level-2', 'level-3', 'level-4', 'eaten');

            if (isEaten) {
                anxiousMan.classList.add('eaten');
            } else if (this.tigerPos >= 80) {
                anxiousMan.classList.add('level-4'); // Panic!
            } else if (this.tigerPos >= 60) {
                anxiousMan.classList.add('level-3'); // Very anxious
            } else if (this.tigerPos >= 40) {
                anxiousMan.classList.add('level-2'); // Worried
            } else if (this.tigerPos >= 20) {
                anxiousMan.classList.add('level-1'); // Mild concern
            }
        }

        // Show skull when eaten
        const skullIcon = this.container.querySelector('.skull-icon');
        if (skullIcon) {
            skullIcon.classList.toggle('visible', isEaten);
        }

        const roarWarning = this.container.querySelector('.roar-warning');
        if (roarWarning) {
            const isCritical = this.dailyDD > (this.maxDailyDD * 0.8) && !isEaten;
            roarWarning.classList.toggle('active', isCritical);
        }

        this.updateStats();
    }

    updateStats() {
        const profitStat = this.container.querySelector('.stat-value.profit');
        if (profitStat) {
            const sign = this.dailyProfit >= 0 ? '+' : '';
            profitStat.textContent = `${sign}$${this.dailyProfit.toFixed(2)}`;
            profitStat.classList.remove('text-green', 'text-red');
            if (this.dailyProfit > 0) profitStat.classList.add('text-green');
            else if (this.dailyProfit < 0) profitStat.classList.add('text-red');
        }

        const goalStat = this.container.querySelector('.stat-value.goal');
        if (goalStat) goalStat.textContent = `$${this.dailyGoal.toFixed(0)}`;

        const riskStat = this.container.querySelector('.stat-value.risk');
        if (riskStat) {
            riskStat.textContent = `${this.dailyDD.toFixed(1)}%`;
            riskStat.classList.toggle('text-warning', this.dailyDD > (this.maxDailyDD * 0.8));
        }

        const maxRiskStat = this.container.querySelector('.stat-value.max-risk');
        if (maxRiskStat) maxRiskStat.textContent = `${this.maxDailyDD}%`;

        const tradeCountStat = this.container.querySelector('.stat-value.trade-count');
        if (tradeCountStat) {
            const maxLabel = this.maxTradesPerDay > 0 ? `/${this.maxTradesPerDay}` : '';
            tradeCountStat.textContent = `${this.todayTradeCount}${maxLabel}`;
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="risk-reward-container">
                <div class="cave-texture"></div>
                
                <div class="animation-tracks">
                    <!-- PROFIT TRACK -->
                    <div class="animation-track profit-track">
                        <span class="track-label profit">THE HUNT (PROFIT)</span>
                        
                        <!-- Treasure Goal -->
                        <div class="treasure-goal">
                            <div class="treasure-glow"></div>
                            <div class="treasure-rays">
                                <div class="treasure-ray"></div>
                                <div class="treasure-ray"></div>
                                <div class="treasure-ray"></div>
                                <div class="treasure-ray"></div>
                                <div class="treasure-ray"></div>
                                <div class="treasure-ray"></div>
                                <div class="treasure-ray"></div>
                                <div class="treasure-ray"></div>
                            </div>
                            <div class="treasure-icon">
                                <i class="fa-solid fa-gem"></i>
                            </div>
                        </div>

                        <!-- Running Hunter -->
                        <div class="hunter-character" style="left: 8%;">
                            <!-- Victory Trophy -->
                            <div class="hunter-trophy">
                                <i class="fa-solid fa-gem"></i>
                            </div>
                            <!-- Victory Sparkles -->
                            <div class="victory-sparkles">
                                <div class="victory-sparkle"></div>
                                <div class="victory-sparkle"></div>
                                <div class="victory-sparkle"></div>
                                <div class="victory-sparkle"></div>
                                <div class="victory-sparkle"></div>
                            </div>
                            <div class="hunter-body">
                                <div class="hunter-figure">
                                    <div class="hunter-icon">
                                        <i class="fa-solid fa-person-running"></i>
                                    </div>
                                </div>
                                <div class="dust-trail" style="display: none;">
                                    <div class="dust-cloud"></div>
                                    <div class="dust-cloud"></div>
                                    <div class="dust-cloud"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="track-progress">
                            <div class="track-progress-fill profit" style="width: 0%"></div>
                        </div>
                    </div>

                    <!-- RISK TRACK -->
                    <div class="animation-track risk-track">
                        <span class="track-label risk">THE TIGER (RISK)</span>

                        <!-- Anxious Stickman (replaces campfire) -->
                        <div class="anxious-man">
                            <div class="anxious-container">
                                <div class="stickman">
                                    <!-- Head -->
                                    <div class="stickman-head">
                                        <div class="stickman-eyebrows">
                                            <div class="stickman-eyebrow left"></div>
                                            <div class="stickman-eyebrow right"></div>
                                        </div>
                                        <div class="stickman-eyes">
                                            <div class="stickman-eye"></div>
                                            <div class="stickman-eye"></div>
                                        </div>
                                        <div class="stickman-mouth"></div>
                                        <div class="sweat-drops">
                                            <div class="sweat-drop"></div>
                                            <div class="sweat-drop"></div>
                                            <div class="sweat-drop"></div>
                                        </div>
                                    </div>
                                    <!-- Body -->
                                    <div class="stickman-body"></div>
                                    <!-- Arms -->
                                    <div class="stickman-arms">
                                        <div class="stickman-arm left"></div>
                                        <div class="stickman-arm right"></div>
                                    </div>
                                    <!-- Legs -->
                                    <div class="stickman-legs">
                                        <div class="stickman-leg left"></div>
                                        <div class="stickman-leg right"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Skull icon (appears when eaten) -->
                        <div class="skull-icon">
                            <i class="fa-solid fa-skull"></i>
                        </div>

                        <!-- Tiger (Actual Image with Burning Glow) -->
                        <div class="tiger-character" style="left: 92%;">
                            <div class="tiger-container">
                                <div class="tiger-glow"></div>
                                <div class="tiger-image-wrapper">
                                    <img src="beast.png" alt="Beast" class="tiger-img" />
                                </div>
                                <div class="dust-trail red" style="display: none;">
                                    <div class="dust-cloud"></div>
                                    <div class="dust-cloud"></div>
                                    <div class="dust-cloud"></div>
                                </div>
                                <div class="roar-warning">
                                    <span class="roar-exclamation">!</span>
                                </div>
                            </div>
                        </div>

                        <div class="track-progress">
                            <div class="track-progress-fill risk" style="width: 0%"></div>
                        </div>
                    </div>
                </div>

                <!-- Stats -->
                <div class="animation-stats">
                    <div class="stat-item">
                        <div class="stat-label">Daily P&L</div>
                        <div class="stat-value profit">$0.00</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Daily Goal</div>
                        <div class="stat-value goal neutral">$0</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Daily DD</div>
                        <div class="stat-value risk">0.0%</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Max DD</div>
                        <div class="stat-value max-risk neutral">5%</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Trades</div>
                        <div class="stat-value trade-count neutral">0</div>
                    </div>
                </div>
            </div>
        `;
    }

    refresh() {
        this.loadData();
        this.updateUI();
    }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const container = document.getElementById('risk-reward-animation');
        if (container) {
            window.riskRewardAnimation = new RiskRewardAnimation('risk-reward-animation');
            console.log('✅ Risk Reward Animation initialized');
        }
    }, 300);
});

if (typeof window !== 'undefined') {
    window.RiskRewardAnimation = RiskRewardAnimation;
}
