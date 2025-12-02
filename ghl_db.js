const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'ghl_database.json');

// Initialize DB file if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}));
}

function readDb() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading DB:", err);
        return {};
    }
}

function writeDb(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error writing DB:", err);
    }
}

function saveToken(locationId, tokenData) {
    const db = readDb();
    db[locationId] = tokenData;
    writeDb(db);
}

function getToken(locationId) {
    const db = readDb();
    return db[locationId];
}

module.exports = {
    saveToken,
    getToken
};
