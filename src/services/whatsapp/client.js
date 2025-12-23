const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const EventEmitter = require('events');
const axios = require('axios');
const config = require('../../config/env');
const logger = require('../../utils/logger');
const whatsappSync = require('../sync/whatsappToGHL');

class WhatsAppClient extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.isReady = false;
    }

    initialize() {
        logger.info('Initializing WhatsApp client...');

        const puppeteerOptions = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        };

        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }

        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'whatsapp-client',
                dataPath: './data/.wwebjs_auth'
            }),
            puppeteer: puppeteerOptions,
            // Disable web cache to avoid corruption issues
            webVersionCache: {
                type: 'none'
            }
        });

        this._setupEvents();
        this.client.initialize();
    }

    _setupEvents() {
        this.client.on('qr', async (qr) => {
            logger.info('QR Code received');
            qrcode.generate(qr, { small: true });

            // Store QR as data URL for dashboard
            const QRCode = require('qrcode');
            this.qrCode = await QRCode.toDataURL(qr);

            this.emit('qr', qr);
        });

        this.client.on('ready', () => {
            logger.info('✅ WhatsApp client is ready!');
            this.isReady = true;
            this.qrCode = null; // Clear QR code when connected
            this.emit('ready');
        });

        this.client.on('message', async (message) => {
            // Ignore Group Messages (@g.us) and Status Updates (status@broadcast)
            if (message.from.includes('@g.us') || message.from.includes('status@broadcast')) {
                return;
            }

            logger.info(`📨 Message from ${message.from}: ${message.body.substring(0, 50)}...`);

            // Sync to GHL automatically
            try {
                const syncResult = await whatsappSync.syncMessageToGHL({
                    from: message.from,
                    body: message.body,
                    type: message.type,
                    timestamp: message.timestamp,
                    hasMedia: message.hasMedia
                });

                if (syncResult.success) {
                    logger.info('✅ Message synced to GHL', syncResult);
                }
            } catch (error) {
                logger.error('Failed to sync message to GHL', { error: error.message });
            }

            this.emit('message', message);
        });

        this.client.on('disconnected', (reason) => {
            logger.warn('WhatsApp client disconnected', { reason });
            this.isReady = false;
            this.emit('disconnected', reason);
        });

        this.client.on('auth_failure', (msg) => {
            logger.error('Authentication failed', { msg });
            this.emit('auth_failure', msg);
        });
    }

    async sendMessage(to, message) {
        if (!this.isReady) throw new Error('WhatsApp client is not ready');

        try {
            const chatId = this._formatChatId(to);
            const result = await this.client.sendMessage(chatId, message);
            logger.info(`📤 Message sent to ${chatId}`);
            return result;
        } catch (error) {
            logger.error('Failed to send message', { to, error: error.message });
            throw error;
        }
    }

    _formatChatId(number) {
        const cleaned = number.replace(/[^\d]/g, '');
        return cleaned.includes('@c.us') ? cleaned : `${cleaned}@c.us`;
    }
}

module.exports = new WhatsAppClient();
