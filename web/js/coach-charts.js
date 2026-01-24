/**
 * Coach Dashboard Charts & Visualization Module
 * Pure SVG/CSS based - No external dependencies
 * 
 * @module CoachCharts
 */

window.VB = window.VB || {};

window.VB.CoachCharts = {
    // Element configuration
    ELEMENTS: ['aufschlag', 'annahme', 'angriff', 'block', 'feldabwehr', 'freeball'],
    ELEMENT_LABELS: {
        aufschlag: 'Aufschlag',
        annahme: 'Annahme',
        angriff: 'Angriff',
        block: 'Block',
        feldabwehr: 'Feldabwehr',
        freeball: 'Freeball'
    },
    ELEMENT_ICONS: {
        aufschlag: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3c4 4 4 14 0 18M3 12c4-4 14-4 18 0"/></svg>',
        annahme: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
        angriff: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 7L17 3l4 4-4 4M3 21l9-9"/></svg>',
        block: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
        feldabwehr: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        freeball: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 010 20M2 12a15 15 0 0020 0"/></svg>'
    },

    // Status icons for alerts and indicators
    STATUS_ICONS: {
        star: '<svg class="icon-sm" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
        warning: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        checkCircle: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        alertCircle: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
        users: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
        zap: '<svg class="icon-sm" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
        swap: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>'
    },

    // Rank icons (1st, 2nd, 3rd place)
    RANK_ICONS: {
        gold: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="hsl(45 93% 47%)" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 8 7 8"/><path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 17 8 17 8"/><path d="M4 22h16"/><path d="M10 22V10h4v12"/><path d="M4 22l4-12h8l4 12"/><path d="M6 22V10h4"/><path d="M18 22V10h-4"/></svg>',
        silver: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="hsl(0 0% 70%)" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 8 7 8"/><path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 17 8 17 8"/><path d="M4 22h16"/><path d="M10 22V10h4v12"/></svg>',
        bronze: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="hsl(30 60% 50%)" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 8 7 8"/><path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 17 8 17 8"/><path d="M4 22h16"/></svg>'
    },

    // Trend arrows
    TREND_ICONS: {
        up: '<svg class="icon-xs trend-arrow up" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 15l-6-6-6 6"/></svg>',
        down: '<svg class="icon-xs trend-arrow down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 9l6 6 6-6"/></svg>',
        stable: '<svg class="icon-xs trend-arrow stable" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12h14"/></svg>'
    },

    // Thresholds for alerts and highlights
    THRESHOLDS: {
        excellent: 2.5,
        good: 2.0,
        warning: 1.0,
        critical: 0.8
    },

    /**
     * Create SVG-based radar chart for a player's stats
     * @param {Object} playerStats - Object with element averages
     * @param {Object} options - Chart options (size, colors)
     * @returns {string} SVG HTML string
     */
    createRadarChart(playerStats, options = {}) {
        const size = options.size || 200;
        const center = size / 2;
        const maxRadius = (size / 2) - 20;
        const elements = this.ELEMENTS;
        const numAxes = elements.length;
        const angleStep = (2 * Math.PI) / numAxes;

        // Colors
        const colors = {
            grid: options.gridColor || 'hsl(var(--slate-700))',
            fill: options.fillColor || 'hsl(166 76% 40% / 0.3)',
            stroke: options.strokeColor || 'hsl(166 76% 50%)',
            text: options.textColor || 'hsl(var(--slate-400))'
        };

        // Build SVG
        let svg = `<svg viewBox="0 0 ${size} ${size}" class="coach-radar-chart" style="width:100%;max-width:${size}px;">`;

        // Background circles (grid levels at 0, 1, 2, 3)
        for (let level = 1; level <= 3; level++) {
            const r = (level / 3) * maxRadius;
            svg += `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="${colors.grid}" stroke-width="1" opacity="0.3"/>`;
        }

        // Axis lines
        for (let i = 0; i < numAxes; i++) {
            const angle = angleStep * i - Math.PI / 2;
            const x2 = center + maxRadius * Math.cos(angle);
            const y2 = center + maxRadius * Math.sin(angle);
            svg += `<line x1="${center}" y1="${center}" x2="${x2}" y2="${y2}" stroke="${colors.grid}" stroke-width="1" opacity="0.3"/>`;
        }

        // Data polygon
        const points = [];
        for (let i = 0; i < numAxes; i++) {
            const element = elements[i];
            const value = this._parseValue(playerStats[element]) || 0;
            const normalizedValue = Math.min(value / 3, 1);
            const angle = angleStep * i - Math.PI / 2;
            const x = center + normalizedValue * maxRadius * Math.cos(angle);
            const y = center + normalizedValue * maxRadius * Math.sin(angle);
            points.push(`${x},${y}`);
        }
        svg += `<polygon points="${points.join(' ')}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2"/>`;

        // Data points
        for (let i = 0; i < numAxes; i++) {
            const element = elements[i];
            const value = this._parseValue(playerStats[element]) || 0;
            const normalizedValue = Math.min(value / 3, 1);
            const angle = angleStep * i - Math.PI / 2;
            const x = center + normalizedValue * maxRadius * Math.cos(angle);
            const y = center + normalizedValue * maxRadius * Math.sin(angle);
            svg += `<circle cx="${x}" cy="${y}" r="4" fill="${colors.stroke}"/>`;
        }

        // Labels
        for (let i = 0; i < numAxes; i++) {
            const angle = angleStep * i - Math.PI / 2;
            const labelRadius = maxRadius + 15;
            const x = center + labelRadius * Math.cos(angle);
            const y = center + labelRadius * Math.sin(angle);
            const label = this.ELEMENT_LABELS[elements[i]];
            const anchor = x < center - 5 ? 'end' : x > center + 5 ? 'start' : 'middle';
            svg += `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" fill="${colors.text}" font-size="10">${label}</text>`;
        }

        svg += '</svg>';
        return svg;
    },

    /**
     * Create a mini performance bar (CSS-based)
     * @param {number|string} value - Current value (0-3 scale)
     * @param {number} max - Maximum value (default: 3)
     * @returns {string} HTML string for mini bar
     */
    createMiniBar(value, max = 3) {
        const numValue = this._parseValue(value);
        if (numValue === null) {
            return `<div class="coach-mini-bar"><div class="coach-mini-bar-fill" style="width: 0%"></div></div><span class="coach-bar-value">--</span>`;
        }

        const percentage = Math.min((numValue / max) * 100, 100);
        const colorClass = this._getColorClass(numValue);

        return `
            <div class="coach-mini-bar">
                <div class="coach-mini-bar-fill ${colorClass}" style="width: ${percentage}%"></div>
            </div>
            <span class="coach-bar-value ${colorClass}">${numValue.toFixed(1)}</span>
        `;
    },

    /**
     * Find top performers across different categories
     * @param {Array} players - Array of player objects
     * @returns {Object} Top performers by category
     */
    findTopPerformers(players) {
        if (!players || players.length === 0) {
            return { bestAttack: null, bestReception: null, mostAces: null };
        }

        const Stats = window.VB.StatsUtils;
        const results = {
            bestAttack: { player: null, value: 0, display: '--' },
            bestReception: { player: null, value: 0, display: '--' },
            mostAces: { player: null, value: 0, display: '0' }
        };

        players.forEach(p => {
            // Best Attack
            const attackAvg = Stats.calcPlayerAvg(p, 'angriff');
            const attackNum = this._parseValue(attackAvg);
            if (attackNum !== null && attackNum > results.bestAttack.value) {
                results.bestAttack = { player: p, value: attackNum, display: attackAvg };
            }

            // Best Reception
            const receptionAvg = Stats.calcPlayerAvg(p, 'annahme');
            const receptionNum = this._parseValue(receptionAvg);
            if (receptionNum !== null && receptionNum > results.bestReception.value) {
                results.bestReception = { player: p, value: receptionNum, display: receptionAvg };
            }

            // Most Aces
            const aces = (p.stats?.aufschlag || []).filter(s => s === 3).length;
            if (aces > results.mostAces.value) {
                results.mostAces = { player: p, value: aces, display: aces.toString() };
            }
        });

        return results;
    },

    /**
     * Find players with critical performance levels
     * @param {Array} players - Array of player objects
     * @returns {Array} Alert objects
     */
    findAlerts(players) {
        if (!players || players.length === 0) return [];

        const Stats = window.VB.StatsUtils;
        const alerts = [];
        const criticalElements = ['annahme', 'aufschlag', 'angriff']; // Primary elements to watch

        players.forEach(p => {
            criticalElements.forEach(element => {
                const avg = Stats.calcPlayerAvg(p, element);
                const numValue = this._parseValue(avg);

                if (numValue !== null && numValue < this.THRESHOLDS.warning) {
                    alerts.push({
                        player: p,
                        element: element,
                        elementLabel: this.ELEMENT_LABELS[element],
                        value: avg,
                        severity: numValue < this.THRESHOLDS.critical ? 'critical' : 'warning',
                        message: numValue < this.THRESHOLDS.critical
                            ? `${p.name} - ${this.ELEMENT_LABELS[element]} kritisch (${avg})`
                            : `${p.name} - ${this.ELEMENT_LABELS[element]} schwach (${avg})`
                    });
                }
            });

            // Check for multiple errors in a row (2+ errors in aufschlag)
            const serveErrors = (p.stats?.aufschlag || []).slice(-5).filter(s => s === 0).length;
            if (serveErrors >= 2) {
                alerts.push({
                    player: p,
                    element: 'aufschlag',
                    elementLabel: 'Aufschlag',
                    value: `${serveErrors} Fehler`,
                    severity: 'warning',
                    message: `${p.name} - ${serveErrors} Aufschlagfehler in letzten 5`
                });
            }
        });

        // Sort by severity (critical first)
        return alerts.sort((a, b) => {
            if (a.severity === 'critical' && b.severity !== 'critical') return -1;
            if (a.severity !== 'critical' && b.severity === 'critical') return 1;
            return 0;
        });
    },

    /**
     * Render top performers section
     * @param {Object} topPerformers - Result from findTopPerformers
     * @returns {string} HTML string
     */
    renderTopPerformers(topPerformers) {
        const items = [
            { key: 'bestAttack', icon: this.RANK_ICONS.gold, label: 'Angriff', ...topPerformers.bestAttack },
            { key: 'bestReception', icon: this.RANK_ICONS.silver, label: 'Annahme', ...topPerformers.bestReception },
            { key: 'mostAces', icon: this.RANK_ICONS.bronze, label: 'Asse', ...topPerformers.mostAces }
        ];

        return items.map(item => {
            if (!item.player) {
                return `<div class="coach-highlight-card empty"><span class="highlight-icon">${item.icon}</span><span class="highlight-text">Keine Daten</span></div>`;
            }
            return `
                <div class="coach-highlight-card">
                    <span class="highlight-icon">${item.icon}</span>
                    <span class="highlight-player">#${item.player.number || '?'} ${item.player.name}</span>
                    <span class="highlight-stat">${item.label}: ${item.display}</span>
                </div>
            `;
        }).join('');
    },

    /**
     * Render alerts section
     * @param {Array} alerts - Result from findAlerts
     * @returns {string} HTML string
     */
    renderAlerts(alerts) {
        if (alerts.length === 0) {
            return `<div class="coach-alert-card success"><span class="alert-icon success">${this.STATUS_ICONS.checkCircle}</span><span class="alert-text">Alle Spieler im grünen Bereich</span></div>`;
        }

        return alerts.slice(0, 3).map(alert => `
            <div class="coach-alert-card ${alert.severity}">
                <span class="alert-icon ${alert.severity}">${alert.severity === 'critical' ? this.STATUS_ICONS.alertCircle : this.STATUS_ICONS.warning}</span>
                <span class="alert-text">${alert.message}</span>
            </div>
        `).join('');
    },

    /**
     * Render player matrix with mini bars
     * @param {Array} players - Array of player objects
     * @returns {string} HTML string for tbody
     */
    renderPlayerMatrix(players) {
        if (!players || players.length === 0) {
            return '<tr><td colspan="5" class="coach-empty-state">Keine Spieler vorhanden</td></tr>';
        }

        const Stats = window.VB.StatsUtils;
        const elements = ['aufschlag', 'annahme', 'angriff', 'block'];

        return players.map(p => {
            const cells = elements.map(el => {
                const avg = Stats.calcPlayerAvg(p, el);
                return `<td class="coach-matrix-cell">${this.createMiniBar(avg)}</td>`;
            }).join('');

            const activeIndicator = p.active ? ` <span class="active-badge">${this.STATUS_ICONS.zap}</span>` : '';

            return `
                <tr>
                    <td class="coach-matrix-player">
                        <span class="player-number">#${p.number || '?'}</span>
                        <span class="player-name">${p.name}${activeIndicator}</span>
                    </td>
                    ${cells}
                </tr>
            `;
        }).join('');
    },

    // Private helper methods
    _parseValue(value) {
        if (value === '--' || value === null || value === undefined) return null;
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(num) ? null : num;
    },

    _getColorClass(value) {
        if (value >= this.THRESHOLDS.good) return 'good';
        if (value >= this.THRESHOLDS.warning) return 'ok';
        return 'bad';
    },

    /**
     * Calculate weighted overall performance score for a player
     * Weights: Attack 40%, Reception 30%, Serve 20%, Block 10%
     * @param {Object} player - Player object with stats
     * @returns {number|null} Score on 0-3 scale, or null if insufficient data
     */
    calculateOverallScore(player) {
        const Stats = window.VB.StatsUtils;
        const weights = { angriff: 0.4, annahme: 0.3, aufschlag: 0.2, block: 0.1 };

        let weightedSum = 0;
        let totalWeight = 0;

        for (const [element, weight] of Object.entries(weights)) {
            const avg = Stats.calcPlayerAvg(player, element);
            const numValue = this._parseValue(avg);
            if (numValue !== null) {
                weightedSum += numValue * weight;
                totalWeight += weight;
            }
        }

        // Return null if no valid data, otherwise normalize by actual weight used
        return totalWeight > 0 ? weightedSum / totalWeight : null;
    },

    /**
     * Calculate trend for a player's element (last 5 actions vs overall)
     * @param {Object} player - Player object
     * @param {string} element - Element name
     * @returns {'up'|'down'|'stable'} Trend direction
     */
    calculateTrend(player, element) {
        const scores = player?.stats?.[element] || [];
        if (scores.length < 5) return 'stable';

        const last5 = scores.slice(-5);
        const last5Avg = last5.reduce((a, b) => a + b, 0) / last5.length;
        const overallAvg = scores.reduce((a, b) => a + b, 0) / scores.length;

        const diff = last5Avg - overallAvg;
        if (diff > 0.3) return 'up';
        if (diff < -0.3) return 'down';
        return 'stable';
    },

    /**
     * Render traffic light indicator based on overall score
     * @param {number|null} score - Overall score 0-3
     * @returns {string} HTML for traffic light dot
     */
    renderTrafficLight(score) {
        if (score === null) return '<span class="traffic-light neutral"></span>';
        let colorClass = 'red';
        if (score >= this.THRESHOLDS.good) colorClass = 'green';
        else if (score >= this.THRESHOLDS.warning) colorClass = 'yellow';
        return `<span class="traffic-light ${colorClass}"></span>`;
    },

    /**
     * Render trend arrow for an element
     * @param {'up'|'down'|'stable'} trend - Trend direction
     * @returns {string} HTML for trend arrow
     */
    renderTrendArrow(trend) {
        return this.TREND_ICONS[trend] || this.TREND_ICONS.stable;
    },

    /**
     * Find substitution recommendations (inactive players outperforming active)
     * @param {Array} players - All players
     * @returns {Array} Substitution recommendations
     */
    findSubstitutionRecommendations(players) {
        if (!players || players.length < 2) return [];

        const activePlayers = players.filter(p => p.active);
        const inactivePlayers = players.filter(p => !p.active);

        if (activePlayers.length === 0 || inactivePlayers.length === 0) return [];

        const recommendations = [];

        activePlayers.forEach(activePlayer => {
            const activeScore = this.calculateOverallScore(activePlayer);
            if (activeScore === null) return;

            // Find inactive players with better scores
            inactivePlayers.forEach(inactivePlayer => {
                const inactiveScore = this.calculateOverallScore(inactivePlayer);
                if (inactiveScore === null) return;

                // Recommend if inactive player scores at least 0.5 better
                if (inactiveScore - activeScore >= 0.5) {
                    recommendations.push({
                        out: activePlayer,
                        outScore: activeScore,
                        in: inactivePlayer,
                        inScore: inactiveScore,
                        scoreDiff: inactiveScore - activeScore
                    });
                }
            });
        });

        // Sort by score difference (most impactful first), limit to 3
        return recommendations
            .sort((a, b) => b.scoreDiff - a.scoreDiff)
            .slice(0, 3);
    },

    /**
     * Render substitution widget
     * @param {Array} recommendations - From findSubstitutionRecommendations
     * @returns {string} HTML for substitution recommendations
     */
    renderSubstitutionWidget(recommendations) {
        if (!recommendations || recommendations.length === 0) {
            return `<div class="substitution-empty">${this.STATUS_ICONS.checkCircle} Keine Auswechslung empfohlen</div>`;
        }

        return recommendations.map(rec => `
            <div class="substitution-card">
                <div class="substitution-out">
                    <span class="substitution-label">RAUS</span>
                    <span class="substitution-player">#${rec.out.number || '?'} ${rec.out.name}</span>
                    <span class="substitution-score bad">${rec.outScore.toFixed(1)}</span>
                </div>
                <span class="substitution-arrow">${this.STATUS_ICONS.swap}</span>
                <div class="substitution-in">
                    <span class="substitution-label">REIN</span>
                    <span class="substitution-player">#${rec.in.number || '?'} ${rec.in.name}</span>
                    <span class="substitution-score good">${rec.inScore.toFixed(1)}</span>
                </div>
            </div>
        `).join('');
    },

    /**
     * Sort players by overall score and add ranking
     * @param {Array} players - Array of player objects
     * @returns {Array} Sorted players with rank property
     */
    rankPlayers(players) {
        if (!players || players.length === 0) return [];

        // Calculate scores and sort
        const playersWithScores = players.map(p => ({
            ...p,
            overallScore: this.calculateOverallScore(p)
        }));

        // Sort by score descending (nulls last)
        playersWithScores.sort((a, b) => {
            if (a.overallScore === null && b.overallScore === null) return 0;
            if (a.overallScore === null) return 1;
            if (b.overallScore === null) return -1;
            return b.overallScore - a.overallScore;
        });

        // Assign ranks
        playersWithScores.forEach((p, idx) => {
            p.rank = idx + 1;
        });

        return playersWithScores;
    },

    /**
     * Render rank badge with color
     * @param {number} rank - Player's rank (1-based)
     * @returns {string} HTML for rank badge
     */
    renderRankBadge(rank) {
        let badgeClass = '';
        if (rank === 1) badgeClass = 'gold';
        else if (rank === 2) badgeClass = 'silver';
        else if (rank === 3) badgeClass = 'bronze';

        return `<span class="rank-badge ${badgeClass}">${rank}</span>`;
    },

    /**
     * Render enhanced player matrix with ranking, traffic lights, and trends
     * @param {Array} players - Array of player objects
     * @returns {string} HTML string for tbody
     */
    renderPlayerMatrixEnhanced(players) {
        if (!players || players.length === 0) {
            return '<tr><td colspan="6" class="coach-empty-state">Keine Spieler vorhanden</td></tr>';
        }

        const Stats = window.VB.StatsUtils;
        const rankedPlayers = this.rankPlayers(players);
        const elements = ['aufschlag', 'annahme', 'angriff', 'block'];

        return rankedPlayers.map(p => {
            const cells = elements.map(el => {
                const avg = Stats.calcPlayerAvg(p, el);
                const trend = this.calculateTrend(p, el);
                return `<td class="coach-matrix-cell">
                    ${this.createMiniBar(avg)}
                    ${this.renderTrendArrow(trend)}
                </td>`;
            }).join('');

            const activeIndicator = p.active ? ` <span class="active-badge">${this.STATUS_ICONS.zap}</span>` : '';
            const trafficLight = this.renderTrafficLight(p.overallScore);
            const rankBadge = this.renderRankBadge(p.rank);

            return `
                <tr>
                    <td class="coach-matrix-player">
                        ${rankBadge}
                        ${trafficLight}
                        <span class="player-number">#${p.number || '?'}</span>
                        <span class="player-name">${p.name}${activeIndicator}</span>
                    </td>
                    ${cells}
                </tr>
            `;
        }).join('');
    }
};

// Convenience alias
window.CoachCharts = window.VB.CoachCharts;
