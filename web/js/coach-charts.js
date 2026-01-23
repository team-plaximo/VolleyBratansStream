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
        aufschlag: '🏐',
        annahme: '🎯',
        angriff: '⚔️',
        block: '🧱',
        feldabwehr: '🛡️',
        freeball: '🎾'
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
            { key: 'bestAttack', icon: '🥇', label: 'Angriff', ...topPerformers.bestAttack },
            { key: 'bestReception', icon: '🥈', label: 'Annahme', ...topPerformers.bestReception },
            { key: 'mostAces', icon: '🥉', label: 'Asse', ...topPerformers.mostAces }
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
            return `<div class="coach-alert-card success"><span class="alert-icon">✅</span><span class="alert-text">Alle Spieler im grünen Bereich</span></div>`;
        }

        return alerts.slice(0, 3).map(alert => `
            <div class="coach-alert-card ${alert.severity}">
                <span class="alert-icon">${alert.severity === 'critical' ? '🔴' : '🟡'}</span>
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

            const activeIndicator = p.active ? ' <span class="active-badge">⚡</span>' : '';

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
    }
};

// Convenience alias
window.CoachCharts = window.VB.CoachCharts;
