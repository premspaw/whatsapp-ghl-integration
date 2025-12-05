# GoHighLevel Conversations Integration Guide

## Overview

This guide explains how to properly sync WhatsApp conversations to GoHighLevel (GHL) so they appear in your GHL interface for each contact.

## What Was Fixed

### 1. **Proper API Endpoints**
- Updated to use the official GHL Conversations API endpoints
- Fixed endpoint paths to match GHL's current API structure
- Added proper authentication headers

### 2. **Correct Message Handling**
- Implemented proper inbound/outbound message differentiation
- Added support for conversation creation with proper metadata
- Fixed message synchronization to prevent duplicates

### 3. **Enhanced Conversation Management**
- Added methods to retrieve conversations from GHL
- Implemented conversation search functionality
- Added message retrieval from existing conversations

## How It Works

### Conversation Flow
1. **WhatsApp Message Received** → Your system processes it
2. **Contact Creation/Update** → Contact is created or found in GHL
3. **Conversation Creation** → Conversation is created in GHL if it doesn't exist
4. **Message Sync** → Messages are added to the GHL conversation
5. **GHL Interface** → Conversations appear in your GHL dashboard

### Key API Endpoints Used

#### Conversations API
- `GET /conversations/search` - Search conversations by contact
- `POST /conversations/` - Create new conversation
- `GET /conversations/{id}` - Get conversation details
- `GET /conversations/{id}/messages` - Get conversation messages

#### Messages API
- `POST /conversations/messages` - Add inbound/outbound messages

## Setup Instructions

### 1. Configure Environment Variables
Make sure your `.env` file has:
```env
GHL_API_KEY=your_ghl_api_key_here
GHL_LOCATION_ID=your_location_id_here
GHL_BASE_URL=https://services.leadconnectorhq.com
```

### 2. Test the Integration
Run the conversation test:
```bash
npm run test-ghl-conversations
```

### 3. Enable GHL Sync for Conversations
In your web interface:
1. Go to a conversation
2. Toggle "Sync to GHL" to ON
3. The conversation will immediately sync to GHL

## API Endpoints Available

### Server Endpoints
- `GET /api/ghl/conversations/search` - Search conversations
- `GET /api/ghl/conversations/:id` - Get conversation details
- `GET /api/ghl/conversations/:id/messages` - Get conversation messages
- `GET /api/ghl/contacts/:contactId/conversations` - Get contact conversations

### Example Usage
```javascript
// Search conversations
const response = await fetch('/api/ghl/conversations/search?contactId=123');
const conversations = await response.json();

// Get conversation messages
const response = await fetch('/api/ghl/conversations/456/messages');
const messages = await response.json();
```

## Viewing Conversations in GHL

### Where to Find Conversations
1. **GHL Dashboard** → Contacts → Select Contact → Conversations Tab
2. **GHL Conversations** → All conversations from all contacts
3. **GHL Inbox** → Unified inbox showing all conversations

### Conversation Details
Each conversation in GHL will show:
- Contact information
- Message history (inbound/outbound)
- Timestamps
- Message types (text, media, etc.)
- Provider (WhatsApp)

## Troubleshooting

### Common Issues

#### 1. Conversations Not Appearing
- Check GHL API key and location ID
- Verify the contact exists in GHL
- Run the test script to verify API connectivity

#### 2. Messages Not Syncing
- Ensure "Sync to GHL" is enabled for the conversation
- Check server logs for API errors
- Verify message format is correct

#### 3. Duplicate Messages
- The system tracks `lastSyncedMessageId` to prevent duplicates
- Only new messages are synced
- Existing conversations are updated, not recreated

### Debug Steps
1. Run `npm run test-ghl-conversations`
2. Check server logs for errors
3. Verify GHL API credentials
4. Test individual API endpoints

## Advanced Features

### Custom Conversation Providers
If you're using custom WhatsApp providers, you can:
1. Set up custom conversation providers in GHL
2. Configure the integration to use your provider
3. Map your provider's message format to GHL's format

### Message Types Supported
- Text messages
- Media messages (images, documents)
- Voice messages
- Location messages
- Contact cards

### Bulk Operations
- Sync all existing conversations: Use the manual sync endpoint
- Batch message processing: Process multiple messages at once
- Scheduled sync: Set up automatic sync intervals

## Best Practices

### 1. **Regular Monitoring**
- Check sync status regularly
- Monitor API rate limits
- Review error logs

### 2. **Data Consistency**
- Ensure phone number formats are consistent
- Use proper contact matching logic
- Handle edge cases (group messages, etc.)

### 3. **Performance Optimization**
- Sync only new messages
- Use batch operations when possible
- Implement proper error handling

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Test individual components using the test scripts
4. Verify GHL API documentation for any changes

## Next Steps

After successful integration:
1. Monitor conversation sync in GHL
2. Set up automated workflows in GHL based on conversations
3. Configure GHL notifications for new messages
4. Set up reporting and analytics on conversation data

Your WhatsApp conversations should now properly appear in your GoHighLevel interface for each contact! 🎉
