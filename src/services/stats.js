const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const STATS_FILE = path.join(process.cwd(), 'data', 'stats.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(STATS_FILE))) {
    fs.mkdirSync(path.dirname(STATS_FILE), { recursive: true });
}

// Initial stats
const initialStats = {
    totalMessagesSent: 0,
    totalAiResponses: 0,
    totalTemplatesSent: 0,
    lastUpdate: new Date().toISOString()
};

const getStats = () => {
    try {
        if (!fs.existsSync(STATS_FILE)) {
            fs.writeFileSync(STATS_FILE, JSON.stringify(initialStats, null, 2));
            return initialStats;
        }
        const data = fs.readFileSync(STATS_FILE, 'utf8');
        return JSON.parse(data || JSON.stringify(initialStats));
    } catch (error) {
        logger.error('Error loading stats', error);
        return initialStats;
    }
};

const updateStats = (updates) => {
    try {
        const currentStats = getStats();
        const newStats = {
            ...currentStats,
            ...updates,
            lastUpdate: new Date().toISOString()
        };
        fs.writeFileSync(STATS_FILE, JSON.stringify(newStats, null, 2));
        return newStats;
    } catch (error) {
        logger.error('Error updating stats', error);
        return null;
    }
};

const incrementStat = (key) => {
    const stats = getStats();
    if (stats.hasOwnProperty(key)) {
        stats[key]++;
        return updateStats(stats);
    }
    return stats;
};

module.exports = {
    getStats,
    incrementStat
};
