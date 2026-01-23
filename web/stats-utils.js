/**
 * Stats Utils Module
 * Shared statistics calculation functions for VolleyBratans Scout System
 * 
 * Used by: scout.js, coach.html
 */

window.VB = window.VB || {};

window.VB.StatsUtils = {
    // Element list (same order as ScoutEngine)
    ELEMENTS: ['aufschlag', 'annahme', 'angriff', 'block', 'feldabwehr', 'freeball'],

    // Thresholds for visual indicators
    THRESHOLDS: {
        good: 2.0,  // >= 2.0 = green
        ok: 1.0     // >= 1.0 = yellow, < 1.0 = red
    },

    /**
     * Calculate average of a scores array
     * @param {number[]} scores - Array of score values (0-3)
     * @returns {number|null} - Average or null if empty
     */
    calculateAverage(scores) {
        if (!scores || scores.length === 0) return null;
        const sum = scores.reduce((a, b) => a + b, 0);
        return sum / scores.length;
    },

    /**
     * Calculate average for a single player's element
     * @param {Object} player - Player object with stats
     * @param {string} element - Element name (e.g., 'angriff')
     * @returns {string} - Formatted average (e.g., "2.50") or "--"
     */
    calcPlayerAvg(player, element) {
        if (!player?.stats?.[element] || player.stats[element].length === 0) {
            return '--';
        }
        const scores = player.stats[element];
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return avg.toFixed(2);
    },

    /**
     * Calculate team average for an element across all players
     * @param {Object[]} players - Array of player objects
     * @param {string} element - Element name
     * @returns {{avg: string, count: number}}
     */
    calcTeamAvg(players, element) {
        if (!players || players.length === 0) return { avg: '--', count: 0 };

        let total = 0;
        let count = 0;

        players.forEach(p => {
            if (p.stats?.[element]) {
                p.stats[element].forEach(score => {
                    total += score;
                    count++;
                });
            }
        });

        return {
            avg: count > 0 ? (total / count).toFixed(2) : '--',
            count
        };
    },

    /**
     * Count specific score values across all players and elements
     * @param {Object[]} players - Array of player objects
     * @param {number} scoreValue - Score to count (0-3)
     * @returns {number}
     */
    countScores(players, scoreValue) {
        if (!players) return 0;

        let count = 0;
        players.forEach(p => {
            this.ELEMENTS.forEach(el => {
                if (p.stats?.[el]) {
                    count += p.stats[el].filter(s => s === scoreValue).length;
                }
            });
        });
        return count;
    },

    /**
     * Count aces (score 3 in aufschlag)
     * @param {Object[]} players - Array of player objects
     * @returns {number}
     */
    countAces(players) {
        if (!players) return 0;

        let count = 0;
        players.forEach(p => {
            if (p.stats?.aufschlag) {
                count += p.stats.aufschlag.filter(s => s === 3).length;
            }
        });
        return count;
    },

    /**
     * Count unforced errors (score 0 across all elements)
     * @param {Object[]} players - Array of player objects
     * @returns {number}
     */
    countErrors(players) {
        return this.countScores(players, 0);
    },

    /**
     * Get total actions for a single player
     * @param {Object} player - Player object
     * @returns {number}
     */
    getTotalActions(player) {
        if (!player?.stats) return 0;
        return this.ELEMENTS.reduce((sum, el) => sum + (player.stats[el]?.length || 0), 0);
    },

    /**
     * Get CSS class based on average value
     * @param {string|number} avg - Average value or "--"
     * @returns {string} - CSS class: 'good', 'ok', 'bad', or ''
     */
    getAvgClass(avg) {
        if (avg === '--' || avg === null) return '';
        const val = typeof avg === 'string' ? parseFloat(avg) : avg;
        if (isNaN(val)) return '';
        if (val >= this.THRESHOLDS.good) return 'good';
        if (val >= this.THRESHOLDS.ok) return 'ok';
        return 'bad';
    },

    /**
     * Calculate reception percentage (score 3 / total)
     * @param {Object[]} players - Array of player objects
     * @returns {number|null} - Percentage or null
     */
    calculateReceptionPct(players) {
        if (!players) return null;

        const scores = players.flatMap(p => p.stats?.annahme || []);
        const perfect = scores.filter(s => s === 3).length;
        return scores.length > 0 ? Math.round((perfect / scores.length) * 100) : null;
    }
};

// Convenience alias
window.StatsUtils = window.VB.StatsUtils;
