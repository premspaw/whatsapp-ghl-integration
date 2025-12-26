const WhatsAppClient = require('./client');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

class WhatsAppManager {
    constructor() {
        this.instances = new Map();
        this.authPath = path.join(process.cwd(), 'data', '.wwebjs_auth');
    }

    /**
     * Start all existing sessions from disk
     */
    async initializeAll() {
        logger.info('Initializing all stored WhatsApp instances...');
        try {
            if (!fs.existsSync(this.authPath)) {
                fs.mkdirSync(this.authPath, { recursive: true });
                return;
            }

            const sessions = fs.readdirSync(this.authPath);
            for (const locationId of sessions) {
                // Ignore hidden files, system files, legacy sessions, and the forbidden 'default' session
                if (locationId.startsWith('.') || locationId.startsWith('session-') || locationId === 'default') continue;

                // Check if it's actually a directory
                const fullPath = path.join(this.authPath, locationId);
                if (!fs.statSync(fullPath).isDirectory()) continue;

                logger.info(`Restoring session for location: ${locationId}`);
                await this.getInstance(locationId);
            }
        } catch (error) {
            logger.error('Failed to initialize all WhatsApp instances', error);
        }
    }

    /**
     * Get or create a WhatsApp instance for a specific location
     */
    async getInstance(locationId) {
        if (!locationId || locationId === 'default') {
            logger.warn('🚫 [Manager] Blocked attempt to create/get a "default" WhatsApp instance.');
            return null;
        }

        if (this.instances.has(locationId)) {
            return this.instances.get(locationId);
        }

        const client = new WhatsAppClient(locationId);
        client.initialize();
        this.instances.set(locationId, client);

        return client;
    }

    /**
     * Remove an instance (logout)
     */
    async removeInstance(locationId) {
        if (this.instances.has(locationId)) {
            const client = this.instances.get(locationId);
            try {
                await client.client.logout();
                await client.client.destroy();
            } catch (e) { }
            this.instances.delete(locationId);
            return true;
        }
        return false;
    }

    async clearAuth(locationId) {
        try {
            const dir = path.join(this.authPath, locationId);
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }
}

module.exports = new WhatsAppManager();
