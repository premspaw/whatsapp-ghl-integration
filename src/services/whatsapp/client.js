const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const EventEmitter = require('events');
const logger = require('../../utils/logger');
const whatsappSync = require('../sync/whatsappToGHL');
const fs = require('fs');
const path = require('path');
const phoneNormalizer = require('../../utils/phoneNormalizer');

class WhatsAppClient extends EventEmitter {
    constructor(locationId) {
        super();
        this.locationId = locationId || 'default';
        this.client = null;
        this.isReady = false;
        this.qrCode = null;
        this.qrText = null;
        this.puppeteerExecutablePath = null;
        this.recentSends = new Map(); // Anti-duplicate cache
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
                '--disable-web-security',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        };

        // Auto-detect executable path if not set
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            this.puppeteerExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        } else {
            const candidates = [
                '/usr/bin/google-chrome',
                '/usr/bin/chromium',
                '/usr/bin/chromium-browser',
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
            ];
            for (const p of candidates) {
                if (fs.existsSync(p)) {
                    puppeteerOptions.executablePath = p;
                    this.puppeteerExecutablePath = p;
                    break;
                }
            }
        }

        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: `whatsapp-${this.locationId}`,
                dataPath: path.join(process.cwd(), 'data', '.wwebjs_auth', this.locationId)
            }),
            puppeteer: puppeteerOptions,
            shell: false,
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1014133543-alpha.html'
            }
        });

        this._setupEvents();
        this.client.initialize().catch(err => {
            logger.error(`Failed to initialize WhatsApp client for ${this.locationId}`, err);
        });
    }

    _setupEvents() {
        this.client.on('qr', async (qr) => {
            logger.info(`QR Code received for ${this.locationId}`);

            const QRCode = require('qrcode');
            this.qrText = qr;
            this.qrCode = await QRCode.toDataURL(qr);

            this.emit('qr', qr);
        });

        this.client.on('ready', () => {
            logger.info(`✅ WhatsApp client is ready for ${this.locationId}`);
            this.isReady = true;
            this.qrCode = null;
            this.qrText = null;
            this.emit('ready');
        });

        // Capture ALL messages (inbound + outbound from phone)
        this.client.on('message_create', async (message) => {
            // Ignore group messages and status updates
            if (message.from.includes('@g.us') || message.from.includes('status@broadcast') ||
                message.to.includes('@g.us') || message.to.includes('status@broadcast')) {
                return;
            }

            // FILTER: Ignore self-messages (Message Yourself)
            const myId = this.client?.info?.wid?._serialized || this.client?.info?.me?._serialized;
            if (myId && message.to === myId && message.fromMe) {
                // This is the bot owner messaging themselves on WhatsApp
                return;
            }
            if (myId && message.from === myId && !message.fromMe) {
                // This is also the bot owner messaging themselves (inbound side)
                return;
            }

            // Case A: INBOUND message from a contact
            if (!message.fromMe) {
                try {
                    const contact = await message.getContact();
                    const realNumber = contact.number || message.from.split('@')[0];

                    logger.info(`📨 [Loc: ${this.locationId}] Incoming from ${realNumber} (JID: ${message.from}): ${message.body.substring(0, 50)}...`);

                    await whatsappSync.syncMessageToGHL(this.locationId, {
                        from: realNumber,
                        body: message.body,
                        type: message.type,
                        timestamp: message.timestamp,
                        hasMedia: message.hasMedia,
                        downloadMedia: message.downloadMedia ? message.downloadMedia.bind(message) : null,
                        direction: 'inbound',
                        whatsappMessage: message // Pass the original message for any extra data if needed
                    });
                } catch (error) {
                    logger.error(`❌ [Loc: ${this.locationId}] Inbound sync failed`, { error: error.message });
                }
            }

            // Case B: OUTBOUND message sent from the physical phone (Manual Reply)
            else {
                try {
                    const contact = await message.getContact();
                    const realNumber = contact.number || message.to.split('@')[0];

                    const chatId = message.to;
                    const body = message.body || '';
                    const mediaUrl = ''; // We can't easily get the URL for phone-sent media without a lot of overhead

                    // Check if our integration just sent this to avoid double syncing
                    const normalizedBody = body.replace(/\s+/g, ' ').trim();
                    const msgHash = `${chatId}|${normalizedBody}|${message.hasMedia}`;
                    if (this.recentSends.has(msgHash)) {
                        const lastSent = this.recentSends.get(msgHash);
                        if (Date.now() - lastSent < 15000) return; // 15s window for phone sync safety
                    }

                    // Add to recentSends to prevent GHL echoes from re-sending this message
                    this.recentSends.set(msgHash, Date.now());

                    logger.info(`📤 [Loc: ${this.locationId}] Native phone reply to ${realNumber} (JID: ${chatId}): ${body.substring(0, 50)}...`);
                    await whatsappSync.syncMessageToGHL(this.locationId, {
                        to: realNumber,
                        from: message.from,
                        body: body,
                        type: message.type,
                        timestamp: message.timestamp,
                        hasMedia: message.hasMedia,
                        downloadMedia: message.downloadMedia ? message.downloadMedia.bind(message) : null,
                        direction: 'outbound'
                    });
                } catch (error) {
                    logger.error(`❌ [Loc: ${this.locationId}] Case B processing failed`, { error: error.message });
                }
            }

            this.emit('message', message);
        });

        this.client.on('disconnected', (reason) => {
            logger.warn(`WhatsApp client disconnected for ${this.locationId}`, { reason });
            this.isReady = false;
            this.qrCode = null;
            this.qrText = null;
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
            let chatId = to;

            // If it doesn't already contain @, try to find the correct WhatsApp ID (resolves CID vs LID)
            if (!to.toString().includes('@')) {
                // Clean input for getNumberId (digits only)
                const cleanNumber = to.toString().replace(/[^\d]/g, '');
                try {
                    const numberId = await this.client.getNumberId(cleanNumber);
                    if (numberId) {
                        chatId = numberId._serialized;
                        logger.info(`🔍 [WhatsApp] Resolved ${to} to JID: ${chatId}`);
                    } else {
                        // Fallback to legacy formatting if lookup fails
                        chatId = this._formatChatId(to);
                        logger.warn(`⚠️ [WhatsApp] Could not resolve ${to} via WhatsApp, falling back to ${chatId}`);
                    }
                } catch (lookupErr) {
                    logger.error(`❌ [WhatsApp] JID resolution failed for ${cleanNumber}`, { error: lookupErr.message });
                    chatId = this._formatChatId(to);
                }
            }

            // --- Anti-Duplicate Logic ---
            const normalizedMsg = (message || '').replace(/\s+/g, ' ').trim();
            const msgHash = `${chatId}|${normalizedMsg}|${!!mediaUrl}`;
            const now = Date.now();
            if (this.recentSends.has(msgHash)) {
                const lastSent = this.recentSends.get(msgHash);
                if (now - lastSent < 5000) { // 5 second window
                    logger.info(`🛡️ [Anti-Duplicate] Skipping identical message to ${to} (Sent ${now - lastSent}ms ago)`);
                    return { id: { _serialized: 'skipped_duplicate' }, timestamp: now };
                }
            }
            this.recentSends.set(msgHash, now);

            // Cleanup old cache entries (older than 1 minute) to prevent memory growth
            if (this.recentSends.size > 100) {
                for (const [key, timestamp] of this.recentSends.entries()) {
                    if (now - timestamp > 60000) this.recentSends.delete(key);
                }
            }
            // ----------------------------

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

        // If it already looks like a WhatsApp ID (contains @), use it as is
        if (number.toString().includes('@')) {
            return number.toString();
        }

        const normalized = phoneNormalizer.normalize(number);
        const digits = normalized.replace('+', '');
        return `${digits}@c.us`;
    }
}

module.exports = WhatsAppClient;
