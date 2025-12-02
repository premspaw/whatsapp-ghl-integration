let fetchFn = global.fetch ? global.fetch.bind(global) : null;
if (!fetchFn) {
  fetchFn = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

class GhlMcpClient {
  constructor(opts = {}) {
    const baseUrl = opts.baseUrl || process.env.GHL_BASE_URL || '';
    const mcpUrl = opts.url || process.env.GHL_MCP_URL || (baseUrl ? `${baseUrl.replace(/\/$/, '')}/mcp/` : '');
    this.url = mcpUrl.replace(/\/$/, '');
    this.pitToken = opts.pitToken || process.env.GHL_PIT_TOKEN || process.env.GHL_API_KEY || '';
    this.locationId = opts.locationId || process.env.GHL_MCP_LOCATION_ID || process.env.GHL_LOCATION_ID || '';
    this.enabled = String(process.env.GHL_MCP_ENABLED || 'true').toLowerCase() === 'true';
  }

  isConfigured() {
    return !!(this.url && this.pitToken);
  }

  headers(extra = {}) {
    const base = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.pitToken}`,
    };
    if (this.locationId) base['locationId'] = this.locationId;
    return { ...base, ...extra };
  }

  async callTool(name, args = {}, extraHeaders = {}) {
    if (!this.enabled || !this.isConfigured()) {
      return { success: false, error: 'GHL MCP disabled or not configured' };
    }

    const endpoint = `${this.url}/`;
    const body = {
      jsonrpc: '2.0',
      id: String(Date.now()),
      method: 'tools/call',
      params: { name, arguments: args }
    };
    try {
      const res = await fetchFn(endpoint, {
        method: 'POST',
        headers: this.headers(extraHeaders),
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) {
        return { success: false, status: res.status, error: text };
      }
      const data = JSON.parse(text);
      const result = data?.result ?? data;
      return { success: true, result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Convenience helpers
  async getContact(contactId, extraHeaders = {}) {
    return this.callTool('contacts_get-contact', { contactId }, extraHeaders);
  }

  async searchConversations(query, extraHeaders = {}) {
    return this.callTool('conversations_search-conversation', { query }, extraHeaders);
  }

  async getMessages(conversationId, extraHeaders = {}) {
    return this.callTool('conversations_get-messages', { conversationId }, extraHeaders);
  }
}

module.exports = GhlMcpClient;