- ndpoint:
  - POST /api/templates with {name, category, text, imageUrl?} .
- Provide preview panel that renders text with sample variables.
- Save button: success toast and list refresh.
- “Send test” button: calls POST /api/whatsapp/send-template with a test phone.
Test Commands

- Create template:
  - curl -sS -X POST https://api.synthcore.in/api/templates -H "Content-Type: application/json" -d '{"name":"welcome","category":"general","text":"Hi {name}, this new automation is working","imageUrl":null}'
- List templates:
  - curl -sS https://api.synthcore.in/api/templates
- Send template (manual):
  - curl -sS -X POST https://api.synthcore.in/api/whatsapp/send-template -H "Content-Type: application/json" -d '{"templateName":"welcome","phone":"+91XXXXXXXXXX","variables":{"name":"Prem"},"imageUrl":null,"tenantId":"location_123"}'
- Simulate GHL webhook trigger:
  - curl -sS -X POST https://api.synthcore.in/webhook/ghl/template-send -H "Content-Type: application/json" -d '{"templateName":"welcome2","variables":{"first_name":"Prem"},"contact":{"phone":"+91XXXXXXXXXX","name":"Prem"},"tenantId":"location_123","requestId":"abc-123"}'
- Verify delivery and logs:
  - curl -sS https://api.synthcore.in/api/whatsapp/status
  - Check PM2 logs for “Template sent” and conversation updates.
Next Steps

- I can implement the endpoints in routes/templatesRoutes.js , wire them in server.js , integrate variable fill and phone normalization, and add webhook verification. Then we’ll test on your VPS.
- After templates are solid, we’ll:
  - Sanitize personality file (remove backticks, trim noisy fields).
  - Enforce RAG-first in enhancedAIService for grounded replies.
  - Consolidate duplicate init logs.
If you want me to start implementing the template routes and webhook right now, I’ll add the files and push the changes for you to pull on the VPS.