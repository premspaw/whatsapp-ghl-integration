# Environment Update Guide for n8n Integration

This guide documents the environment flags and configuration required to enable n8n-managed AI replies (RAG-first) while keeping local fallback intact.

## New/Relevant Variables

- `AI_MODE` — Controls primary AI path. Set to `n8n` to prefer n8n.
- `N8N_ENABLED` — Boolean (`true`/`false`). Enables forwarding to n8n.
- `N8N_AI_REPLY_URL` — n8n Webhook URL for `ai-reply` (POST). Example: `https://your-n8n.host/webhook/ai-reply`
- `N8N_API_KEY` — Optional API key sent as `X-Api-Key` header to n8n.

These variables are already read by `server.js`:

```env
# Prefer n8n for AI, with local fallback if n8n fails
AI_MODE=n8n
N8N_ENABLED=true
N8N_AI_REPLY_URL=https://your-n8n.host/webhook/ai-reply
N8N_API_KEY=replace-with-strong-key

# Existing vars (examples)
PORT=3000
OPENROUTER_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
WHATSAPP_SESSION_NAME=default
USE_MOCK_WHATSAPP=false
```

## Expected n8n Payload

The server forwards a JSON body like:

```json
{
  "text": "Incoming message text",
  "from": "+91XXXXXXXXXX",
  "contactName": "Contact Name",
  "tenantId": "location_or_tenant_id",
  "conversationId": "contact_or_conversation_id",
  "messageType": "text",
  "fromMe": false
}
```

Headers include `Content-Type: application/json` and `X-Api-Key: {N8N_API_KEY}` when set.

Expected n8n response for success:

```json
{
  "text": "Grounded AI reply to send via WhatsApp"
}
```

If n8n returns an empty `text` or an error, the server automatically falls back to local `EnhancedAIService` to generate a reply.

## How to Toggle

- To use local AI only: set `N8N_ENABLED=false` or leave `N8N_AI_REPLY_URL` empty.
- To use n8n-first: set `N8N_ENABLED=true` and provide a valid `N8N_AI_REPLY_URL`.

## Quick Tests

- Verify server health: `curl -sS http://localhost:3000/api/health`
- Simulate inbound WhatsApp (provider webhook):

```bash
curl -sS -X POST http://localhost:3000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: ${N8N_API_KEY}" \
  -d '{
    "text":"Hello!", "phone":"+91XXXXXXXXXX", "contact": {"name":"Prem"}
  }'
```

Expect the server to forward to n8n, then send the reply back via WhatsApp. If n8n fails, the local AI will respond.

## Notes

- No changes were made to template endpoints (`/api/templates`). Existing flows continue to work.
- Device-mode inbound and provider webhook both prefer n8n when enabled.

