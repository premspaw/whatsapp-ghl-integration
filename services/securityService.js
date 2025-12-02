const crypto = require('crypto');

class SecurityService {
  constructor() {
    this.whatsappSecret = process.env.WEBHOOK_SECRET_WHATSAPP || null;
    this.ghlSecret = process.env.WEBHOOK_SECRET_GHL || null;
    this.idempotencyTTL = parseInt(process.env.IDEMPOTENCY_TTL_MS || '86400000'); // 24h
    this.minIntervalMs = parseInt(process.env.RATE_LIMIT_INTERVAL_MS || '10000'); // 10s
    this.dailyLimit = parseInt(process.env.RATE_LIMIT_DAILY || '100');

    this.idempotencyStore = new Map(); // eventId -> expiresAt
    this.rateStore = new Map(); // phone -> { lastSentAt, date, count }
  }

  // Simple shared-secret header verification
  verifyHeaderSecret(req, expected) {
    try {
      if (!expected) return true; // disabled
      const headerVal = req.headers['x-webhook-secret'] || req.headers['x-secret'] || '';
      return headerVal === expected;
    } catch (e) {
      return false;
    }
  }

  // Optional HMAC verification (needs raw body)
  verifyHmacSignature(rawBody, signatureHeader, secret) {
    try {
      if (!rawBody || !signatureHeader || !secret) return false;
      const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      // constant-time compare
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    } catch (e) {
      return false;
    }
  }

  computeEventId(payload) {
    try {
      const id = payload.id || payload.message_id || payload.providerMessageId || payload.messageId;
      if (id) return String(id);
      const digest = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      return digest;
    } catch (e) {
      return String(Date.now());
    }
  }

  isDuplicateEvent(eventId) {
    try {
      const exp = this.idempotencyStore.get(eventId);
      if (!exp) return false;
      if (Date.now() > exp) {
        this.idempotencyStore.delete(eventId);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  markEventProcessed(eventId) {
    try {
      this.idempotencyStore.set(eventId, Date.now() + this.idempotencyTTL);
    } catch (e) {}
  }

  canSendToContact(phone) {
    try {
      if (!phone) return false;
      const today = new Date().toISOString().slice(0, 10);
      const entry = this.rateStore.get(phone) || { lastSentAt: 0, date: today, count: 0 };
      // reset daily counter if date changed
      if (entry.date !== today) {
        entry.date = today;
        entry.count = 0;
      }
      // daily cap
      if (entry.count >= this.dailyLimit) return false;
      // interval check
      if (Date.now() - entry.lastSentAt < this.minIntervalMs) return false;
      return true;
    } catch (e) {
      return true;
    }
  }

  registerContactSend(phone) {
    try {
      if (!phone) return;
      const today = new Date().toISOString().slice(0, 10);
      const entry = this.rateStore.get(phone) || { lastSentAt: 0, date: today, count: 0 };
      if (entry.date !== today) {
        entry.date = today;
        entry.count = 0;
      }
      entry.lastSentAt = Date.now();
      entry.count += 1;
      this.rateStore.set(phone, entry);
    } catch (e) {}
  }
}

module.exports = SecurityService;


