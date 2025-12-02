let fetchFn = global.fetch ? global.fetch.bind(global) : null;
if (!fetchFn) {
  fetchFn = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

class PineconeMcpClient {
  constructor(opts = {}) {
    this.host = opts.host || process.env.PINECONE_ASSISTANT_HOST;
    this.assistant = opts.assistant || process.env.PINECONE_ASSISTANT_NAME;
    this.apiKey = opts.apiKey || process.env.PINECONE_API_KEY;
    this.enabled = String(process.env.PINECONE_MCP_ENABLED || 'true').toLowerCase() === 'true';
  }

  isConfigured() {
    return !!(this.host && this.assistant && this.apiKey);
  }

  async getContext(query, { topK = 8, tenantId = null } = {}) {
    if (!this.enabled || !this.isConfigured()) {
      return [];
    }
    const url = `${this.host.replace(/\/$/, '')}/mcp/assistants/${this.assistant}`;
    const body = {
      jsonrpc: '2.0',
      id: String(Date.now()),
      method: 'tools/call',
      params: {
        name: 'get_context',
        arguments: {
          query,
          topK,
          top_k: topK,
          // Many MCP servers accept a generic filter object; include tenantId when present
          filter: tenantId ? { tenantId } : undefined,
        }
      }
    };
    try {
      const res = await fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // MCP requires clients to accept both JSON and SSE
          'Accept': 'application/json, text/event-stream',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn(`Pinecone MCP HTTP ${res.status}: ${text}`);
        return [];
      }
      const contentType = (res.headers && (res.headers.get ? res.headers.get('content-type') : res.headers['content-type'])) || '';
      let data;
      if (String(contentType).includes('application/json')) {
        data = await res.json();
      } else if (String(contentType).includes('text/event-stream')) {
        // Parse SSE payloads by scanning all data: lines and choosing the one with items
        const text = await res.text();
        try {
          const lines = text.split(/\r?\n/);
          const dataLines = lines.filter(l => l.trim().startsWith('data:'))
            .map(l => l.trim().replace(/^data:\s*/, ''))
            .filter(Boolean);
          let lastParsed = null;
          let withItems = null;
          for (const dl of dataLines) {
            try {
              const obj = JSON.parse(dl);
              lastParsed = obj;
              const maybe = obj.result || obj;
              const maybeItems = maybe.items || maybe.snippets || maybe.results;
              if (Array.isArray(maybeItems) && maybeItems.length > 0) {
                withItems = obj;
              }
            } catch (_) {}
          }
          data = withItems || lastParsed || {};
        } catch (e) {
          console.warn('Pinecone MCP SSE parse failed, raw text:', text.slice(0, 200));
          return [];
        }
      } else {
        // Unknown content-type; attempt text->JSON as a last resort
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch (_) {
          console.warn('Pinecone MCP unknown content-type. Returning empty context.');
          return [];
        }
      }
      // Normalize potential JSON-RPC responses
      const result = data?.result || data;
      const items = result?.items || result?.snippets || result?.results || [];
      if (!Array.isArray(items)) return [];
      return items.map((it) => {
        // Some assistants return { type: 'text', text: '{...json...}' }
        let content = it.text || it.content || it.snippet || '';
        let title = it.title || it.source?.title || '';
        let source = it.source?.url || it.source?.filename || it.url || it.id || '';
        let score = typeof it.score === 'number' ? it.score : undefined;

        // If content looks like JSON, parse and extract common fields
        if (typeof content === 'string' && content.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(content);
            content = parsed.content || parsed.text || content;
            title = parsed.file_name || title || 'context';
            source = parsed.file_name || parsed.url || source || 'pinecone-assistant';
            score = typeof parsed.score === 'number' ? parsed.score : score;
          } catch (_) {
            // leave as-is
          }
        }

        return {
          title: title || 'context',
          content,
          source: source || 'pinecone-assistant',
          score,
        };
      }).filter(x => x.content);
    } catch (err) {
      console.error('Pinecone MCP getContext error:', err.message);
      return [];
    }
  }
}

module.exports = PineconeMcpClient;