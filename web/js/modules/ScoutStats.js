/**
 * Scout Stats Module - Statistics Calculations
 * Calculates team and player statistics
 * 
 * @module ScoutStats
 */

export class ScoutStats {
    /**
     * Calculate average for an array of scores
     */
    static calculateAverage(scores) {
        if (!scores || scores.length === 0) return '--';
        const sum = scores.reduce((a, b) => a + b, 0);
        return (sum / scores.length).toFixed(2);
    }

    /**
     * Get CSS class based on average value
     */
    static getAverageClass(avg) {
        if (avg === '--') return '';
        const val = parseFloat(avg);
        if (val >= 2.5) return 'good';
        if (val >= 1.5) return 'average';
        return 'poor';
    }

    /**
     * Calculate player average for an element
     */
    static calcPlayerAvg(player, element) {
        if (!player?.scores?.[element]) return '--';
        return ScoutStats.calculateAverage(player.scores[element]);
    }

    /**
     * Calculate team average for an element
     */
    static calcTeamAvg(players, element) {
        if (!players || players.length === 0) {
            return { avg: '--', count: 0 };
        }

        let total = 0;
        let count = 0;

        players.forEach(player => {
            if (player.scores?.[element]) {
                player.scores[element].forEach(score => {
                    total += score;
                    count++;
                });
            }
        });

        return {
            avg: count > 0 ? (total / count).toFixed(2) : '--',
            count: count
        };
    }

    /**
     * Calculate kill ratio (attack efficiency)
     */
    static calculateKillRatio(players) {
        if (!players) return '--';

        let kills = 0;
        let total = 0;

        players.forEach(player => {
            if (player.scores?.angriff) {
                player.scores.angriff.forEach(score => {
                    total++;
                    if (score === 3) kills++;
                });
            }
        });

        if (total === 0) return '--';
        return Math.round((kills / total) * 100) + '%';
    }

    /**
     * Calculate reception percentage (perfect passes)
     */
    static calculateReceptionPct(players) {
        if (!players) return '--';

        let perfect = 0;
        let total = 0;

        players.forEach(player => {
            if (player.scores?.annahme) {
                player.scores.annahme.forEach(score => {
                    total++;
                    if (score === 3) perfect++;
                });
            }
        });

        if (total === 0) return '--';
        return Math.round((perfect / total) * 100) + '%';
    }

    /**
     * Count aces (score 3 on aufschlag)
     */
    static countAces(players) {
        if (!players) return 0;

        let count = 0;
        players.forEach(player => {
            if (player.scores?.aufschlag) {
                count += player.scores.aufschlag.filter(s => s === 3).length;
            }
        });
        return count;
    }

    /**
     * Count unforced errors (score 0 on any element)
     */
    static countErrors(players) {
        if (!players) return 0;

        let count = 0;
        const elements = ['aufschlag', 'annahme', 'angriff', 'block', 'feldabwehr', 'freeball'];

        players.forEach(player => {
            elements.forEach(el => {
                if (player.scores?.[el]) {
                    count += player.scores[el].filter(s => s === 0).length;
                }
            });
        });
        return count;
    }

    /**
     * Get total actions for a player
     */
    static getTotalActions(player) {
        if (!player?.scores) return 0;

        let total = 0;
        const elements = ['aufschlag', 'annahme', 'angriff', 'block', 'feldabwehr', 'freeball'];

        elements.forEach(el => {
            if (player.scores[el]) {
                total += player.scores[el].length;
            }
        });
        return total;
    }

    /**
     * Get summary statistics for all players
     */
    static getSummary(players) {
        return {
            killRatio: ScoutStats.calculateKillRatio(players),
            receptionPct: ScoutStats.calculateReceptionPct(players),
            aces: ScoutStats.countAces(players),
            errors: ScoutStats.countErrors(players),
            attack: ScoutStats.calcTeamAvg(players, 'angriff'),
            reception: ScoutStats.calcTeamAvg(players, 'annahme'),
            serve: ScoutStats.calcTeamAvg(players, 'aufschlag'),
            block: ScoutStats.calcTeamAvg(players, 'block'),
            defense: ScoutStats.calcTeamAvg(players, 'feldabwehr'),
            freeball: ScoutStats.calcTeamAvg(players, 'freeball')
        };
    }
}

export default ScoutStats;
