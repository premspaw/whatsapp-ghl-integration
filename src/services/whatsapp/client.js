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
                '--disable-gpu',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
            // Force a stable web version to fix the "Evaluation failed: t" error
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
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

    async sendMessage(to, message, mediaUrl = null, mediaType = 'image', buttons = null) {
        if (!this.isReady) throw new Error('WhatsApp client is not ready');

        try {
            const chatId = this._formatChatId(to);
            logger.info(`📤 Preparing to send message to ${chatId}`);

            // Pre-verify contact to avoid "t" error on non-existent numbers
            try {
                const isRegistered = await this.client.isRegisteredUser(chatId);
                if (!isRegistered) {
                    throw new Error(`The number ${to} is not registered on WhatsApp.`);
                }
            } catch (err) {
                logger.warn(`Contact verification failed for ${chatId}: ${err.message}`);
                // Continue anyway if it's just a protocol error, but block if clearly not registered
                if (err.message.includes('not registered')) throw err;
            }

            let result;

            // Handle Buttons if provided
            if (buttons && Array.isArray(buttons) && buttons.length > 0) {
                const { Buttons } = require('whatsapp-web.js');
                const formattedButtons = buttons.map(btn => ({ body: btn }));
                const buttonMessage = new Buttons(
                    message || '',
                    formattedButtons,
                    '', // Title
                    ''  // Footer
                );
                result = await this.client.sendMessage(chatId, buttonMessage);
                logger.info(`🔘 Button message sent to ${chatId}`);
                return result;
            }

            if (mediaUrl) {
                logger.info(`📸 Sending media (${mediaType}) to ${chatId}: ${mediaUrl}`);
                try {
                    const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });

                    const options = {};
                    if (message) options.caption = message;

                    if (mediaType === 'document' || mediaType === 'pdf') {
                        options.sendMediaAsDocument = true;
                    }

                    result = await this.client.sendMessage(chatId, media, options);
                    logger.info(`✅ ${mediaType} sent successfully to ${chatId}`);
                } catch (mediaError) {
                    logger.error(`❌ Media failed for ${chatId} (${mediaError.message}), falling back to text`);
                    if (message) {
                        result = await this.client.sendMessage(chatId, message);
                    } else {
                        throw mediaError;
                    }
                }
            } else {
                result = await this.client.sendMessage(chatId, message);
                logger.info(`📤 Text message sent to ${chatId}`);
            }

            return result;
        } catch (error) {
            logger.error('Failed to send message', { to, error: error.message });
            throw error;
        }
    }

    _formatChatId(number) {
        if (!number) return '';

        // Remove all non-numeric characters
        let cleaned = number.toString().replace(/[^\d]/g, '');

        // Handle common formatting issues
        // If it starts with 0 and is 11 digits (like 08123133382), it's likely an Indian number missing 91
        if (cleaned.startsWith('0') && cleaned.length === 11) {
            cleaned = '91' + cleaned.substring(1);
        }

        // If it's 10 digits and doesn't have 91, assume India
        if (cleaned.length === 10) {
            cleaned = '91' + cleaned;
        }

        // Ensure it ends with @c.us
        return cleaned.includes('@c.us') ? cleaned : `${cleaned}@c.us`;
    }
}

module.exports = new WhatsAppClient();
