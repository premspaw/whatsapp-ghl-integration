# Conversation Tabs System

## Overview

The WhatsApp to GHL Integration system now includes a comprehensive conversation tab system that organizes conversations by channel type, similar to GoHighLevel's conversation management interface.

## Tab Structure

### 1. WhatsApp Tab
- **Icon**: WhatsApp logo
- **Purpose**: Shows all WhatsApp conversations
- **Features**:
  - Private WhatsApp conversations
  - WhatsApp group conversations
  - Real-time message updates
  - AI reply toggle per conversation
  - GHL sync toggle per conversation

### 2. SMS Tab
- **Icon**: SMS icon
- **Purpose**: Shows all SMS conversations
- **Features**:
  - SMS conversations from Twilio/Vonage
  - AI reply functionality
  - GHL sync integration
  - Message history tracking

### 3. Email Tab
- **Icon**: Email envelope icon
- **Purpose**: Shows all email conversations
- **Features**:
  - Email conversations from SMTP
  - Subject line display
  - AI reply functionality
  - GHL sync integration
  - Thread management

### 4. All Tab
- **Icon**: List icon
- **Purpose**: Shows all conversations across all channels
- **Features**:
  - Combined view of all conversation types
  - Channel type badges
  - Unified conversation management
  - Cross-channel AI replies

## Channel Types and Icons

| Channel Type | Icon | Description |
|--------------|------|-------------|
| WhatsApp Private | 🟢 WhatsApp | One-on-one WhatsApp conversations |
| WhatsApp Group | 👥 Users | WhatsApp group conversations |
| SMS | 📱 SMS | Text message conversations |
| Email | ✉️ Envelope | Email conversations |

## Features by Tab

### WhatsApp Tab Features
- **Real-time Connection**: Live WhatsApp Web integration
- **QR Code Authentication**: Scan to connect your WhatsApp
- **Message Types**: Text, images, documents, voice messages
- **Group Support**: Handle both private and group conversations
- **Status Indicators**: Online/offline status display

### SMS Tab Features
- **Provider Support**: Twilio and Vonage integration
- **Webhook Handling**: Receive SMS messages via webhooks
- **Number Management**: Send/receive from configured numbers
- **Delivery Status**: Track message delivery

### Email Tab Features
- **SMTP Integration**: Connect to any SMTP server
- **Thread Management**: Handle email threads and replies
- **Rich Content**: Support for HTML emails
- **Attachment Handling**: Process email attachments

### All Tab Features
- **Unified View**: See all conversations in one place
- **Channel Filtering**: Filter by conversation type
- **Cross-Platform AI**: AI replies work across all channels
- **Unified GHL Sync**: Sync all conversations to GoHighLevel

## Conversation Management

### Per-Conversation Controls
Each conversation has individual controls:

1. **AI Reply Toggle**
   - Enable/disable automatic AI responses
   - Works across all channel types
   - Customizable AI prompts per conversation type

2. **GHL Sync Toggle**
   - Enable/disable GoHighLevel synchronization
   - Creates contacts and conversations in GHL
   - Maintains conversation history

3. **Channel Indicators**
   - Visual indicators for conversation type
   - Status badges for AI and GHL sync
   - Last activity timestamps

### Message Handling
- **Real-time Updates**: Live message streaming via WebSocket
- **Message History**: Persistent conversation storage
- **AI Integration**: Automatic reply generation
- **GHL Sync**: Automatic synchronization with GoHighLevel

## API Endpoints

### Conversation Management
```
GET /api/conversations - Get all conversations
GET /api/conversations/type/:type - Get conversations by type
GET /api/conversations/:id - Get specific conversation
POST /api/conversations/:id/ai-toggle - Toggle AI replies
POST /api/conversations/:id/ghl-sync - Toggle GHL sync
```

### Message Sending
```
POST /api/send-message - Send WhatsApp message
POST /api/send-sms - Send SMS message
POST /api/send-email - Send email message
```

## Configuration

### Environment Variables
```env
# WhatsApp Configuration
WHATSAPP_SESSION_NAME=Mywhatsapp

# SMS Configuration
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=your_phone_number

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# GHL Configuration
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_location_id

# AI Configuration
OPENAI_API_KEY=your_openai_api_key
```

## Usage Examples

### Switching Between Tabs
```javascript
// Switch to WhatsApp tab
app.switchTab('whatsapp');

// Switch to SMS tab
app.switchTab('sms');

// Switch to Email tab
app.switchTab('email');

// Switch to All tab
app.switchTab('all');
```

### Managing Conversations
```javascript
// Enable AI for a conversation
await fetch(`/api/conversations/${conversationId}/ai-toggle`, {
  method: 'POST',
  body: JSON.stringify({ enabled: true })
});

// Enable GHL sync for a conversation
await fetch(`/api/conversations/${conversationId}/ghl-sync`, {
  method: 'POST',
  body: JSON.stringify({ enabled: true })
});
```

## Benefits

1. **Unified Interface**: Manage all communication channels in one place
2. **Channel Organization**: Clear separation of conversation types
3. **Cross-Platform AI**: AI replies work across all channels
4. **GHL Integration**: Seamless synchronization with GoHighLevel
5. **Real-time Updates**: Live message streaming and status updates
6. **Flexible Configuration**: Enable/disable features per conversation
7. **Scalable Architecture**: Easy to add new channel types

## Future Enhancements

- **Voice Call Integration**: Add voice call conversations
- **Social Media Integration**: Facebook, Instagram, Twitter
- **Video Call Support**: Zoom, Teams integration
- **Advanced Analytics**: Conversation metrics and insights
- **Custom Channel Types**: User-defined conversation types
