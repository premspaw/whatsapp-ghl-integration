const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const EventEmitter = require('events');
const logger = require('../../utils/logger');
const whatsappSync = require('../sync/whatsappToGHL');

class WhatsAppClient extends EventEmitter {
    constructor(locationId) {
        super();
        this.locationId = locationId || 'default';
        this.client = null;
        this.isReady = false;
        this.qrCode = null;
    }

    initialize() {
        logger.info(`Initializing WhatsApp client for location: ${this.locationId}`);

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
                clientId: `whatsapp-${this.locationId}`,
                dataPath: `./data/.wwebjs_auth/${this.locationId}`
            }),
            puppeteer: puppeteerOptions,
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
            logger.info(`QR Code received for ${this.locationId}`);
            // qrcode.generate(qr, { small: true });

            const QRCode = require('qrcode');
            this.qrCode = await QRCode.toDataURL(qr);

            this.emit('qr', qr);
        });

        this.client.on('ready', () => {
            logger.info(`✅ WhatsApp client is ready for ${this.locationId}`);
            this.isReady = true;
            this.qrCode = null;
            this.emit('ready');
        });

        this.client.on('message', async (message) => {
            if (message.from.includes('@g.us') || message.from.includes('status@broadcast')) {
                return;
            }

            logger.info(`📨 [Loc: ${this.locationId}] Message from ${message.from}: ${message.body.substring(0, 50)}...`);

            try {
                const syncResult = await whatsappSync.syncMessageToGHL(this.locationId, {
                    from: message.from,
                    body: message.body,
                    type: message.type,
                    timestamp: message.timestamp,
                    hasMedia: message.hasMedia,
                    downloadMedia: message.downloadMedia ? message.downloadMedia.bind(message) : null
                });

                if (syncResult.success) {
                    logger.info(`✅ [Loc: ${this.locationId}] Message synced to GHL`, syncResult);
                }
            } catch (error) {
                logger.error(`❌ [Loc: ${this.locationId}] Failed to sync message to GHL`, { error: error.message });
            }

            this.emit('message', message);
        });

        this.client.on('disconnected', (reason) => {
            logger.warn(`WhatsApp client disconnected for ${this.locationId}`, { reason });
            this.isReady = false;
            this.emit('disconnected', reason);
        });

        this.client.on('auth_failure', (msg) => {
            logger.error(`Authentication failed for ${this.locationId}`, { msg });
            this.emit('auth_failure', msg);
        });
    }

    async sendMessage(to, message, mediaUrl = null, mediaType = 'image', buttons = null) {
        if (!this.isReady) throw new Error(`WhatsApp client not ready for ${this.locationId}`);

        try {
            const chatId = this._formatChatId(to);
            let result;

            if (buttons && Array.isArray(buttons) && buttons.length > 0) {
                const { Buttons } = require('whatsapp-web.js');
                const formattedButtons = buttons.map(btn => ({ body: btn }));
                const buttonMessage = new Buttons(
                    message || '',
                    formattedButtons,
                    '',
                    ''
                );
                result = await this.client.sendMessage(chatId, buttonMessage);
                return result;
            }

            if (mediaUrl) {
                try {
                    const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
                    const options = {};
                    if (message) options.caption = message;
                    if (mediaType === 'document' || mediaType === 'pdf') {
                        options.sendMediaAsDocument = true;
                    }
                    result = await this.client.sendMessage(chatId, media, options);
                } catch (mediaError) {
                    if (message) {
                        result = await this.client.sendMessage(chatId, message);
                    } else {
                        throw mediaError;
                    }
                }
            } else {
                result = await this.client.sendMessage(chatId, message);
            }

            return result;
        } catch (error) {
            logger.error(`Failed to send message [Loc: ${this.locationId}]`, { to, error: error.message });
            throw error;
        }
    }

    _formatChatId(number) {
        if (!number) return '';
        let cleaned = number.toString().replace(/[^\d]/g, '');
        if (cleaned.startsWith('0') && cleaned.length === 11) {
            cleaned = '91' + cleaned.substring(1);
        }
        if (cleaned.length === 10) {
            cleaned = '91' + cleaned;
        }
        return cleaned.includes('@c.us') ? cleaned : `${cleaned}@c.us`;
    }
}

module.exports = WhatsAppClient;
