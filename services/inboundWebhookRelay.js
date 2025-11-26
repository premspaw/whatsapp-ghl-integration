const axios = require('axios');

// Lightweight UUID v4 fallback to avoid hard dependency
let uuidv4;
try {
  uuidv4 = require('uuid').v4;
} catch (_) {
  uuidv4 = () => `relay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

class InboundWebhookRelay {
  constructor(options = {}) {
    this.webhookUrl = options.webhookUrl || process.env.INBOUND_WEBHOOK_URL || process.env.WEBHOOK_URL;
    this.secret = options.secret || process.env.WEBHOOK_SECRET || process.env.INBOUND_WEBHOOK_SECRET;
    this.apiKey = options.apiKey || process.env.N8N_API_KEY || process.env.WEBHOOK_API_KEY || '';
    this.defaultIntegration = process.env.GHL_LOCATION_ID || process.env.INTEGRATION_ID || 'default';
    this.timeoutMs = parseInt(process.env.WEBHOOK_TIMEOUT_MS || '10000');
  }

  isHttps(url) {
    return typeof url === 'string' && /^https:\/\//i.test(url);
  }

  // Normalize WhatsApp timestamps (seconds -> ms)
  normalizeTimestamp(ts) {
    if (!ts) return Date.now();
    const n = Number(ts);
    return n < 10 ** 12 ? n * 1000 : n; // seconds to ms if needed
  }

  // Map whatsapp-web.js types to required enum
  mapMessageType(type, hasMedia) {
    const t = String(type || '').toLowerCase();
    if (hasMedia) return 'media';
    if (t === 'chat' || t === 'text') return 'text';
    if (t.includes('location')) return 'location';
    if (t.includes('button')) return 'button';
    if (t.includes('template')) return 'template';
    return 'text';
  }

  async postWithRetry(url, payload, headers) {
    const backoffs = [1000, 2000, 4000];
    let lastErr;
    for (let attempt = 0; attempt <= backoffs.length; attempt++) {
      try {
        const resp = await axios.post(url, payload, {
          timeout: this.timeoutMs,
          headers
        });
        const ctype = String((resp.headers && (resp.headers['content-type'] || resp.headers['Content-Type'])) || '');
        const isHtml = /text\/html/i.test(ctype);
        if (resp.status === 200 && !isHtml) return { delivered: true, status: resp.status, data: resp.data, url };
        lastErr = new Error(`Unexpected status ${resp.status}`);
      } catch (err) {
        lastErr = err;
        const status = err?.response?.status;
        const isRetryable = !status || (status >= 500 && status < 600);
        if (!isRetryable || attempt === backoffs.length) break;
        await new Promise(r => setTimeout(r, backoffs[attempt]));
      }
    }
    return { delivered: false, error: lastErr?.response?.data || lastErr?.message || 'unknown error', url };
  }

  async send({
    phone,
    fromName = 'Unknown Contact',
    message = '',
    messageType = 'text',
    messageId = '',
    integration = this.defaultIntegration,
    timestamp = Date.now(),
    replyToken = null,
    attachments = [],
    overrideUrl = null,
    overrideSecret = null
  }) {
    const urlToUse = (overrideUrl && this.isHttps(overrideUrl)) ? overrideUrl : this.webhookUrl;
    if (!urlToUse || !this.isHttps(urlToUse)) {
      console.warn('InboundWebhookRelay: invalid or non-HTTPS webhook URL. Skipping.', urlToUse);
      return { delivered: false, error: 'invalid_webhook_url' };
    }

    // Helpful warning: n8n Test URLs require clicking "Execute workflow"
    if (/webhook-test\//i.test(urlToUse)) {
      console.warn('InboundWebhookRelay: using n8n TEST URL. Click "Execute workflow" in n8n or switch to the Production URL to avoid 404s.');
    }

    const traceId = uuidv4();
    const headers = {
      'Content-Type': 'application/json',
      'x-webhook-secret': (overrideSecret || this.secret || ''),
      'x-trace-id': traceId
    };

    // Optional API key header for n8n Cloud or secured webhook setups
    if (this.apiKey) {
      headers['X-Api-Key'] = this.apiKey;
    }

    const payload = {
      phone,
      fromName,
      message,
      text: message,
      messageType,
      messageId,
      integration,
      timestamp: this.normalizeTimestamp(timestamp),
      replyToken,
      attachments: Array.isArray(attachments) ? attachments : []
    };

    return await this.postWithRetry(urlToUse, payload, headers);
  }
}

module.exports = InboundWebhookRelay;
