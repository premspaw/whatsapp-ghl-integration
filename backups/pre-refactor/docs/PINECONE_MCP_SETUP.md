# Pinecone Assistant MCP Setup

Configure your server to use your Pinecone Assistant as a remote MCP context source.

## Environment Variables

Add these to your `.env`:

```
PINECONE_MCP_ENABLED=true
PINECONE_ASSISTANT_HOST=https://prod-1-data.ke.pinecone.io
PINECONE_ASSISTANT_NAME=whatappdemo
PINECONE_API_KEY=pcsk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## What this does

- The server calls `POST {PINECONE_ASSISTANT_HOST}/mcp/assistants/{PINECONE_ASSISTANT_NAME}`
- Uses `Authorization: Bearer {PINECONE_API_KEY}`
- Sends a JSON-RPC `tools/call` for the `context` tool with your query
- Returns structured context snippets that ground WhatsApp replies

## Quick Test

1. Start your server.
2. POST to `http://localhost:3000/api/ai/context/test`:

```
curl -sS -X POST http://localhost:3000/api/ai/context/test \
  -H "Content-Type: application/json" \
  -d '{"query":"What services do you provide?","topK":8}'
```

You should get `{ success: true, count: N, items: [...] }` with snippet texts.

## WhatsApp Flow

- When a message arrives, the AI pipeline tries:
  - GHL KB (optional) → Pinecone MCP context → vector fallback → keyword fallback
- If RAG-first is enabled and no context is found, non-text suppression avoids unguided replies.

## Notes

- The older `/sse` streaming endpoint mentioned in some clients is deprecated. Use the main MCP HTTP endpoint as above.
- `tenantId` is passed when available to help filter context in multi-tenant setups.