const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const BILLING_FILE = path.join(process.cwd(), 'data', 'billing.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(BILLING_FILE))) {
    fs.mkdirSync(path.dirname(BILLING_FILE), { recursive: true });
}

/**
 * Initial billing structure for a new location
 */
const initialBilling = {
    balance: 0.00,
    rate: 0.20, // Default 20 Paise
    totalSpent: 0.00,
    currency: 'INR',
    recharges: [],
    lastUpdate: new Date().toISOString()
};

const getBilling = (locationId = 'default') => {
    try {
        let allBilling = {};
        if (fs.existsSync(BILLING_FILE)) {
            allBilling = JSON.parse(fs.readFileSync(BILLING_FILE, 'utf8') || '{}');
        }

        if (!allBilling[locationId]) {
            allBilling[locationId] = { ...initialBilling };
        }

        return allBilling[locationId];
    } catch (error) {
        logger.error('Error loading billing', error);
        return { ...initialBilling };
    }
};

const getAllBilling = () => {
    try {
        if (fs.existsSync(BILLING_FILE)) {
            return JSON.parse(fs.readFileSync(BILLING_FILE, 'utf8') || '{}');
        }
        return {};
    } catch (error) {
        logger.error('Error loading all billing', error);
        return {};
    }
};

const saveBilling = (allBilling) => {
    try {
        fs.writeFileSync(BILLING_FILE, JSON.stringify(allBilling, null, 2));
    } catch (error) {
        logger.error('Error saving billing', error);
    }
};

/**
 * Deduct credit for an AI response
 */
const deductCredit = (locationId = 'default') => {
    try {
        if (locationId === 'default') return;

        let allBilling = {};
        if (fs.existsSync(BILLING_FILE)) {
            allBilling = JSON.parse(fs.readFileSync(BILLING_FILE, 'utf8') || '{}');
        }

        if (!allBilling[locationId]) {
            allBilling[locationId] = { ...initialBilling };
        }

        const billing = allBilling[locationId];
        const rate = billing.rate || 0.20;

        billing.balance = parseFloat((billing.balance - rate).toFixed(2));
        billing.totalSpent = parseFloat((billing.totalSpent + rate).toFixed(2));
        billing.lastUpdate = new Date().toISOString();

        saveBilling(allBilling);

        logger.info(`💰 [Billing] Deducted ₹${rate} from ${locationId}. New balance: ₹${billing.balance}`);
    } catch (error) {
        logger.error('Error deducting credit', error);
    }
};

/**
 * Recharge a wallet
 */
const recharge = (locationId = 'default', amount = 0) => {
    try {
        if (!locationId || amount <= 0) return;

        let allBilling = {};
        if (fs.existsSync(BILLING_FILE)) {
            allBilling = JSON.parse(fs.readFileSync(BILLING_FILE, 'utf8') || '{}');
        }

        if (!allBilling[locationId]) {
            allBilling[locationId] = { ...initialBilling };
        }

        const billing = allBilling[locationId];
        billing.balance = parseFloat((billing.balance + amount).toFixed(2));
        billing.recharges.push({
            amount,
            timestamp: new Date().toISOString()
        });
        billing.lastUpdate = new Date().toISOString();

        saveBilling(allBilling);

        logger.info(`💳 [Billing] Recharged ₹${amount} for ${locationId}. New balance: ₹${billing.balance}`);
        return billing;
    } catch (error) {
        logger.error('Error recharging', error);
        throw error;
    }
};

/**
 * Set custom rate for a location
 */
const setRate = (locationId = 'default', rate = 0.20) => {
    try {
        let allBilling = {};
        if (fs.existsSync(BILLING_FILE)) {
            allBilling = JSON.parse(fs.readFileSync(BILLING_FILE, 'utf8') || '{}');
        }

        if (!allBilling[locationId]) {
            allBilling[locationId] = { ...initialBilling };
        }

        allBilling[locationId].rate = parseFloat(rate);
        allBilling[locationId].lastUpdate = new Date().toISOString();

        saveBilling(allBilling);

        logger.info(`⚙️ [Billing] Set rate to ₹${rate} for ${locationId}`);
        return allBilling[locationId];
    } catch (error) {
        logger.error('Error setting rate', error);
        throw error;
    }
};

module.exports = {
    getBilling,
    deductCredit,
    recharge,
    setRate
};
