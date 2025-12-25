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

const getStats = (locationId = 'default') => {
    try {
        let allStats = {};
        if (fs.existsSync(STATS_FILE)) {
            allStats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8') || '{}');
        }

        // Initialize location stats if missing
        if (!allStats[locationId]) {
            allStats[locationId] = { ...initialStats };
            // Don't save yet to avoid IO spam on read, but return default structure
        }

        return allStats[locationId];
    } catch (error) {
        logger.error('Error loading stats', error);
        return initialStats;
    }
};

const saveStats = (allStats) => {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(allStats, null, 2));
    } catch (error) {
        logger.error('Error saving stats', error);
    }
};

const incrementStat = (key, locationId = 'default') => {
    try {
        let allStats = {};
        if (fs.existsSync(STATS_FILE)) {
            allStats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8') || '{}');
        }

        if (!allStats[locationId]) {
            allStats[locationId] = { ...initialStats };
        }

        if (allStats[locationId].hasOwnProperty(key)) {
            allStats[locationId][key]++;
            allStats[locationId].lastUpdate = new Date().toISOString();
            saveStats(allStats);
        }
    } catch (error) {
        logger.error('Error incrementing stat', error);
    }
};

module.exports = {
    getStats,
    incrementStat
};
