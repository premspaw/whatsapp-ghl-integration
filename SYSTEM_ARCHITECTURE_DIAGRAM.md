# 🏗️ System Architecture Diagram

## Complete System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          WHATSAPP TO GHL PLATFORM                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL SYSTEMS                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────┐  │
│  │  WhatsApp   │    │  GoHighLevel │    │   OpenAI /   │    │ Twilio  │  │
│  │     Web     │    │     API      │    │  OpenRouter  │    │   SMS   │  │
│  └──────┬──────┘    └──────┬───────┘    └──────┬───────┘    └────┬────┘  │
│         │                  │                     │                 │         │
└─────────┼──────────────────┼─────────────────────┼─────────────────┼─────────┘
          │                  │                     │                 │
          ▼                  ▼                     ▼                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            WEBHOOK LAYER                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  /webhook/whatsapp    /webhook/ghl/*    /webhook/ai/*    /api/ghl/webhook  │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │              Signature Validation & Security                 │           │
│  │  - Rate Limiting  - CORS  - Input Sanitization              │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                                                               │
└────────────────────────────────────┬─────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          EXPRESS SERVER (PORT 3000)                           │
│                              server.js (2416 lines)                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       SOCKET.IO (Real-time Layer)                      │  │
│  │  - Message broadcasts  - Status updates  - Typing indicators          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         REST API (40+ Endpoints)                       │  │
│  │  /api/conversations  /api/messages  /api/ghl/*  /api/ai/*  /api/db/*  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
└────────────────────────────────────┬─────────────────────────────────────────┘
                                     │
                    ┌────────────────┴───────────────┐
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              SERVICE LAYER                                    │
├───────────────────┬─────────────────┬─────────────────┬─────────────────────┤
│                   │                 │                 │                      │
│  ┌──────────┐    │  ┌──────────┐  │  ┌──────────┐  │  ┌──────────┐       │
│  │ WhatsApp │    │  │   GHL    │  │  │    AI    │  │  │ Webhook  │       │
│  │ Service  │    │  │ Service  │  │  │ Services │  │  │ Service  │       │
│  └────┬─────┘    │  └────┬─────┘  │  └────┬─────┘  │  └────┬─────┘       │
│       │          │       │         │       │         │       │              │
│  • WhatsApp      │  • Contacts     │  • Basic AI     │  • GHL Events       │
│    Web.js        │  • Messages     │  • Enhanced AI  │  • Validation       │
│  • Mock Mode     │  • Tasks        │  • MCP AI       │  • Cache            │
│  • Media         │  • Pipeline     │  • RAG          │    Invalidation     │
│  • QR Auth       │  • Tags         │  • Embeddings   │                     │
│                  │  • Opportunities │                │                     │
│                  │                 │                 │                      │
├──────────────────┴─────────────────┴─────────────────┴─────────────────────┤
│                                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   SMS    │  │  Email   │  │ Security │  │Embeddings│  │Conversation│   │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │  │  Manager   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                                               │
└────────────────────────────────┬──────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE REPOSITORY LAYER                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Contact    │  │ Conversation │  │   Message    │  │  Embedding   │   │
│  │     Repo     │  │     Repo     │  │     Repo     │  │     Repo     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                               │
│  ┌──────────────┐  ┌────────────────────────────────────────────────┐      │
│  │   Handoff    │  │         Supabase Client                        │      │
│  │     Repo     │  │  - Connection Pool  - Query Builder            │      │
│  └──────────────┘  └────────────────────────────────────────────────┘      │
│                                                                               │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      SUPABASE (POSTGRES + PGVECTOR)                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   contacts   │  │conversations │  │   messages   │  │ai_embeddings │   │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤   │
│  │ id           │  │ id           │  │ id           │  │ id           │   │
│  │ phone        │  │ contact_id   │  │ conversation │  │ text         │   │
│  │ ghl_contact  │  │ channel      │  │ direction    │  │ embedding    │   │
│  │ name         │  │ last_msg_at  │  │ content      │  │   vector(1536)│  │
│  │ metadata     │  │              │  │ media        │  │ source_type  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                               │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ai_conversation_ │  │training_     │  │ events_queue │  │ ai_models  │  │
│  │    memory       │  │  sources     │  │              │  │            │  │
│  ├─────────────────┤  ├──────────────┤  ├──────────────┤  ├────────────┤  │
│  │ conversation_id │  │ type         │  │ type         │  │ provider   │  │
│  │ role            │  │ url          │  │ payload      │  │ model_name │  │
│  │ text            │  │ status       │  │ attempts     │  │ temperature│  │
│  │ tokens          │  │              │  │              │  │            │  │
│  └─────────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
│                                                                               │
│  Indexes: phone, conversation_id, contact_id, embedding (vector)             │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagrams

### 1. Inbound WhatsApp Message Flow

```
┌────────────┐
│  WhatsApp  │  User sends message
│    User    │
└─────┬──────┘
      │ 1. Message
      ▼
┌────────────────────────┐
│  WhatsApp Web.js       │  Receives via WebSocket
│  (whatsappService)     │
└─────┬──────────────────┘
      │ 2. Parse & validate
      ▼
┌────────────────────────┐
│  Conversation Manager  │  Store message, get settings
└─────┬──────────────────┘
      │ 3. Save to DB
      ▼
┌────────────────────────┐
│  Message Repository    │  INSERT into messages
│  (Supabase)            │
└─────┬──────────────────┘
      │
      ├─────────────────────────────────┐
      │                                 │
      ▼                                 ▼
┌────────────────┐            ┌──────────────────┐
│ AI Enabled?    │            │ GHL Sync Enabled?│
└────┬───────────┘            └────┬─────────────┘
     │ YES                         │ YES
     ▼                             ▼
┌────────────────────────┐   ┌──────────────────────────┐
│  Enhanced AI Service   │   │    GHL Service           │
├────────────────────────┤   ├──────────────────────────┤
│ 1. Get GHL metadata    │   │ 1. Create/update contact │
│ 2. Fetch embeddings    │   │ 2. Post to conversation  │
│ 3. Get memory (12 msg) │   │ 3. Sync tags             │
│ 4. Build context       │   └──────────────────────────┘
│ 5. Call AI model       │
│ 6. Get response        │
└────┬───────────────────┘
     │
     ▼
┌────────────────────────┐
│  WhatsApp Service      │  Send AI reply
│  (Send message)        │
└────────────────────────┘
     │
     ▼
┌────────────────────────┐
│  Save to DB            │  Store AI reply
└────────────────────────┘
     │
     ▼
┌────────────────────────┐
│  Socket.IO Broadcast   │  Update frontend in real-time
└────────────────────────┘
```

---

### 2. GHL Outbound Message Flow (GHL → WhatsApp)

```
┌────────────────────┐
│  GoHighLevel UI    │  Agent sends message
└─────┬──────────────┘
      │ 1. Trigger: Outbound SMS
      ▼
┌────────────────────────────┐
│  GHL Webhook               │
│  POST /webhook/ghl/outgoing│
└─────┬──────────────────────┘
      │ 2. Validate signature
      ▼
┌────────────────────────┐
│  Webhook Service       │  Parse payload
└─────┬──────────────────┘
      │ 3. Get contact phone
      ▼
┌────────────────────────┐
│  Contact Repository    │  Lookup by ghl_contact_id
└─────┬──────────────────┘
      │ 4. Contact found
      ▼
┌────────────────────────┐
│  WhatsApp Service      │  Send message via WhatsApp
└─────┬──────────────────┘
      │ 5. Message sent
      ▼
┌────────────────────────┐
│  GHL Service           │  POST delivery status back
│  (Update conversation) │
└─────┬──────────────────┘
      │ 6. Save locally
      ▼
┌────────────────────────┐
│  Message Repository    │  INSERT into messages
└────────────────────────┘
```

---

### 3. AI RAG (Retrieval Augmented Generation) Flow

```
┌──────────────┐
│ User Message │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│ Enhanced AI Service      │
└──────┬───────────────────┘
       │
       ├───────────────────┬───────────────────┬─────────────────┐
       │                   │                   │                 │
       ▼                   ▼                   ▼                 ▼
┌─────────────┐    ┌──────────────┐   ┌─────────────┐  ┌──────────────┐
│ Get GHL     │    │ Get Short-   │   │ Retrieve    │  │ Get Contact  │
│ Contact     │    │ term Memory  │   │ Embeddings  │  │ Custom Fields│
│ Metadata    │    │ (12 messages)│   │ (Vector     │  │              │
│             │    │              │   │  Search)    │  │              │
│ - Tags      │    │ - user       │   │             │  │ - Industry   │
│ - Tasks     │    │ - assistant  │   │ - Docs      │  │ - Preferences│
│ - Pipeline  │    │ - timestamps │   │ - FAQs      │  │ - History    │
│ - Opps      │    │              │   │ - Past      │  │              │
│             │    │              │   │   convos    │  │              │
└─────┬───────┘    └──────┬───────┘   └─────┬───────┘  └──────┬───────┘
      │                   │                  │                 │
      └───────────────────┴──────────────────┴─────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │   Build Prompt Context       │
                    ├──────────────────────────────┤
                    │ System: You are assistant... │
                    │                              │
                    │ GHL Context:                 │
                    │ {tags, tasks, pipeline}      │
                    │                              │
                    │ Retrieved Documents:         │
                    │ [Top 5 relevant chunks]      │
                    │                              │
                    │ Conversation History:        │
                    │ [Last 12 messages]           │
                    │                              │
                    │ User: [Current message]      │
                    └──────────┬───────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  OpenAI / OpenRouter │
                    │  GPT-4 / Claude      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  AI Response         │
                    │  (Context-aware)     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Check for Actions   │
                    │  - Create task?      │
                    │  - Update tag?       │
                    │  - Book appointment? │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Execute Actions     │
                    │  (GHL Service)       │
                    └──────────────────────┘
```

---

### 4. Training Data Ingestion Flow

```
┌──────────────────┐
│  Admin uploads   │  Website URL or Document
│  Training Data   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ POST /api/ai/train/*     │
└────────┬─────────────────┘
         │
         ├────────────────┬────────────────┐
         │                │                │
         ▼                ▼                ▼
  ┌──────────┐     ┌──────────┐    ┌──────────┐
  │ Website  │     │   PDF    │    │   Text   │
  │ Crawl    │     │  Upload  │    │  Manual  │
  └────┬─────┘     └────┬─────┘    └────┬─────┘
       │                │                │
       └────────────────┴────────────────┘
                        │
                        ▼
            ┌──────────────────────┐
            │  Text Extraction     │
            │  & Cleaning          │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Text Chunking       │
            │  (500-1000 chars)    │
            │  (20% overlap)       │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Generate Embeddings │
            │  (OpenAI Ada-002)    │
            │  vector(1536)        │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Store in Supabase   │
            │  ai_embeddings table │
            │                      │
            │  - text              │
            │  - embedding vector  │
            │  - metadata (source) │
            └──────────────────────┘
```

---

### 5. Human Handoff Flow

```
┌────────────────┐
│  AI detects    │  Keywords: "human", "agent", "speak to person"
│  handoff intent│
└────────┬───────┘
         │
         ▼
┌────────────────────────┐
│ POST /api/handoff/     │
│      create            │
├────────────────────────┤
│ - conversation_id      │
│ - reason               │
│ - priority             │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  Handoff Repository    │  INSERT into handoffs table
└────────┬───────────────┘
         │
         ├─────────────────────────────┬────────────────────┐
         │                             │                    │
         ▼                             ▼                    ▼
┌────────────────┐          ┌────────────────┐    ┌────────────────┐
│ Send Email     │          │ Socket.IO      │    │ Disable AI     │
│ to Agents      │          │ Notification   │    │ for Convo      │
└────────────────┘          └────────────────┘    └────────────────┘
                                     │
                                     ▼
                            ┌────────────────────┐
                            │  Agent Dashboard   │
                            │  Shows pending     │
                            │  handoffs          │
                            └────────┬───────────┘
                                     │
                                     ▼
                            ┌────────────────────┐
                            │ Agent clicks       │
                            │ "Assign to me"     │
                            └────────┬───────────┘
                                     │
                                     ▼
                            ┌────────────────────────┐
                            │ POST /api/handoff/     │
                            │      assign            │
                            └────────┬───────────────┘
                                     │
                                     ▼
                            ┌────────────────────┐
                            │ Agent handles      │
                            │ conversation       │
                            │ manually           │
                            └────────┬───────────┘
                                     │
                                     ▼
                            ┌────────────────────────┐
                            │ POST /api/handoff/     │
                            │      resolve           │
                            │                        │
                            │ - Mark as resolved     │
                            │ - Re-enable AI (opt.)  │
                            └────────────────────────┘
```

---

## 🎨 Frontend Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      PUBLIC DIRECTORY                             │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────┐
│   index.html        │  │ simple-dashboard    │  │ agent-       │
│                     │  │      .html          │  │ dashboard    │
│ - QR Code Display   │  │                     │  │     .html    │
│ - Connection Status │  │ - Conversation List │  │              │
│ - Initial Setup     │  │ - Message View      │  │ - Handoffs   │
│                     │  │ - AI Toggle         │  │ - Assignment │
│                     │  │ - GHL Sync Toggle   │  │ - Resolution │
└─────────────────────┘  └─────────────────────┘  └──────────────┘

┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────┐
│ ai-management-      │  │ automation-         │  │ ghl-whatsapp │
│ dashboard.html      │  │ dashboard.html      │  │ -tab.html    │
│                     │  │                     │  │              │
│ - Upload Docs       │  │ - Workflow Builder  │  │ - GHL iframe │
│ - Crawl Website     │  │ - Trigger Config    │  │ - Tab View   │
│ - View Embeddings   │  │ - Action Mapping    │  │ - Integration│
│ - Model Config      │  │                     │  │              │
└─────────────────────┘  └─────────────────────┘  └──────────────┘

                    ┌──────────────────────┐
                    │   public/js/         │
                    ├──────────────────────┤
                    │ - app.js             │
                    │   (Frontend logic)   │
                    │                      │
                    │ - whatsapp-widget.js │
                    │   (Widget component) │
                    └──────────────────────┘

                    All dashboards use:
                    - Socket.IO client
                    - Vanilla JavaScript
                    - Responsive CSS
                    - Real-time updates
```

---

## 🔐 Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                   SECURITY STACK                         │
└─────────────────────────────────────────────────────────┘

     ┌──────────────────────────────────────┐
     │   Layer 1: Network Security          │
     ├──────────────────────────────────────┤
     │ - CORS Configuration                 │
     │ - HTTPS in Production                │
     │ - Webhook Signature Validation       │
     └──────────────────────────────────────┘
                       │
                       ▼
     ┌──────────────────────────────────────┐
     │   Layer 2: Authentication            │
     ├──────────────────────────────────────┤
     │ - API Key Validation                 │
     │ - Supabase Row-Level Security        │
     │ - JWT for Admin Access (future)      │
     └──────────────────────────────────────┘
                       │
                       ▼
     ┌──────────────────────────────────────┐
     │   Layer 3: Rate Limiting             │
     ├──────────────────────────────────────┤
     │ - Per Contact: 1 msg / 10s           │
     │ - Per API Endpoint: 100 req/min      │
     │ - Per IP: 1000 req/hour              │
     └──────────────────────────────────────┘
                       │
                       ▼
     ┌──────────────────────────────────────┐
     │   Layer 4: Input Validation          │
     ├──────────────────────────────────────┤
     │ - XSS Prevention                     │
     │ - SQL Injection Prevention           │
     │ - Phone Number Validation            │
     │ - Content Sanitization               │
     └──────────────────────────────────────┘
                       │
                       ▼
     ┌──────────────────────────────────────┐
     │   Layer 5: Data Protection           │
     ├──────────────────────────────────────┤
     │ - Environment Variables              │
     │ - No Hardcoded Secrets               │
     │ - Encrypted API Keys                 │
     │ - Audit Logging                      │
     └──────────────────────────────────────┘
                       │
                       ▼
     ┌──────────────────────────────────────┐
     │   Layer 6: Compliance                │
     ├──────────────────────────────────────┤
     │ - Opt-in Tracking                    │
     │ - GDPR Delete Endpoint               │
     │ - Data Retention Policies            │
     │ - Privacy by Design                  │
     └──────────────────────────────────────┘
```

---

## 🔄 Message Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│              COMPLETE MESSAGE LIFECYCLE                          │
└─────────────────────────────────────────────────────────────────┘

INBOUND MESSAGE:
1. WhatsApp → whatsappService.on('message')
2. Dedupe check (provider_message_id)
3. Filter (groups, broadcasts)
4. conversationManager.processMessage()
5. messageRepo.create()
6. [If AI enabled] → enhancedAIService.generateReply()
   a. ghlService.getContactMeta()
   b. embeddingRepo.search()
   c. messageRepo.getRecent(12)
   d. buildContext()
   e. OpenAI/OpenRouter API call
   f. Parse response
   g. Check for actions
   h. Execute actions (GHL API)
7. whatsappService.sendMessage()
8. messageRepo.create() (AI reply)
9. [If GHL sync] → ghlService.postMessage()
10. socket.emit('message') (real-time update)

OUTBOUND MESSAGE (from GHL):
1. GHL Workflow triggers
2. Webhook → POST /webhook/ghl/outgoing
3. webhookService.validate()
4. contactRepo.getByGHLId()
5. whatsappService.sendMessage()
6. messageRepo.create()
7. ghlService.updateMessageStatus()
8. socket.emit('message')

OUTBOUND MESSAGE (from Dashboard):
1. User clicks "Send" in dashboard
2. POST /api/send-message
3. conversationManager.sendMessage()
4. whatsappService.sendMessage()
5. messageRepo.create()
6. [If GHL sync] → ghlService.postMessage()
7. socket.emit('message')

MESSAGE STATES:
- pending (queued)
- sending (in progress)
- sent (delivered to WhatsApp)
- delivered (delivered to recipient)
- read (read by recipient)
- failed (delivery failed)
- error (processing error)
```

---

## 📊 Performance & Scaling

```
┌─────────────────────────────────────────────────────────┐
│              PERFORMANCE OPTIMIZATIONS                   │
└─────────────────────────────────────────────────────────┘

┌────────────────────┐
│   Caching Layer    │
├────────────────────┤
│ GHL Contact Meta:  │
│ - TTL: 5-15 min    │
│ - Invalidation     │
│   on webhook       │
│                    │
│ Embeddings:        │
│ - In-memory index  │
│ - Lazy loading     │
└────────────────────┘

┌────────────────────┐
│   Database Indexes │
├────────────────────┤
│ - phone            │
│ - conversation_id  │
│ - contact_id       │
│ - embedding vector │
│   (pgvector)       │
└────────────────────┘

┌────────────────────┐
│   Connection Pool  │
├────────────────────┤
│ Supabase:          │
│ - Pool size: 10    │
│ - Timeout: 30s     │
│ - Retry: 3x        │
└────────────────────┘

┌────────────────────┐
│   Job Queue        │
├────────────────────┤
│ - Async processing │
│ - Retry mechanism  │
│ - Exponential      │
│   backoff          │
│ - Max attempts: 3  │
└────────────────────┘

┌────────────────────┐
│   Rate Limiting    │
├────────────────────┤
│ - Contact: 1/10s   │
│ - API: 100/min     │
│ - WhatsApp: 80/min │
│ - AI: 20/min       │
└────────────────────┘
```

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 DEPLOYMENT OPTIONS                       │
└─────────────────────────────────────────────────────────┘

OPTION 1: Railway
┌──────────────────────────┐
│  Railway Container       │
│  - Auto-deploy from Git  │
│  - Env vars from UI      │
│  - Health checks         │
│  - Auto-restart          │
│  - Custom domain         │
└──────────────────────────┘

OPTION 2: Vercel
┌──────────────────────────┐
│  Vercel Serverless       │
│  - Edge functions        │
│  - Auto-scaling          │
│  - CDN distribution      │
│  - Webhook endpoints     │
└──────────────────────────┘

OPTION 3: Render
┌──────────────────────────┐
│  Render Web Service      │
│  - Docker support        │
│  - Background workers    │
│  - PostgreSQL addon      │
│  - SSL certificates      │
└──────────────────────────┘

OPTION 4: Self-Hosted
┌──────────────────────────┐
│  VPS (DigitalOcean/AWS)  │
│  - Full control          │
│  - PM2 process manager   │
│  - Nginx reverse proxy   │
│  - Let's Encrypt SSL     │
│  - Custom monitoring     │
└──────────────────────────┘

All connect to:
┌──────────────────────────┐
│  Supabase Cloud          │
│  - Postgres + pgvector   │
│  - Automatic backups     │
│  - Connection pooling    │
└──────────────────────────┘
```

---

## 🎯 Key Integration Points

```
┌──────────────────────────────────────────────────────────────┐
│                INTEGRATION TOUCHPOINTS                        │
└──────────────────────────────────────────────────────────────┘

1. WhatsApp ↔ Platform
   ├─ QR Authentication
   ├─ Message Events
   ├─ Media Downloads
   ├─ Delivery Receipts
   └─ Session Management

2. GHL ↔ Platform
   ├─ Contacts API
   ├─ Conversations API
   ├─ Tasks API
   ├─ Opportunities API
   ├─ Webhooks (inbound)
   └─ Webhook Triggers (outbound)

3. AI ↔ Platform
   ├─ Chat Completion API
   ├─ Embeddings API
   ├─ RAG Pipeline
   ├─ Context Building
   └─ Action Detection

4. Database ↔ Platform
   ├─ Real-time Subscriptions
   ├─ Vector Similarity Search
   ├─ Row-Level Security
   └─ Connection Pooling

5. Frontend ↔ Platform
   ├─ WebSocket (Socket.IO)
   ├─ REST API
   ├─ File Upload
   └─ Authentication

6. External Services ↔ Platform
   ├─ Twilio (SMS)
   ├─ SMTP (Email)
   ├─ Webhook Providers
   └─ Monitoring (Sentry)
```

---

*This architecture diagram provides a complete visual overview of your WhatsApp to GHL integration platform.*

