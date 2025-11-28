# WhatsApp AI Chatbot with Business Knowledge Integration

This guide provides comprehensive documentation for the WhatsApp AI Chatbot system with enhanced business knowledge integration capabilities.

## System Overview

The WhatsApp AI Chatbot is an advanced communication system that integrates:

- WhatsApp messaging
- Go High Level (GHL) CRM integration
- AI-powered conversation capabilities
- Business knowledge integration (PDF documents and website content)
- Conversation memory and context awareness
- Analytics and monitoring dashboard

## Key Components

### Core Services

1. **WhatsApp Service**: Handles WhatsApp connection and messaging
2. **GHL Service**: Integrates with Go High Level CRM
3. **Enhanced AI Service**: Provides AI-powered conversation capabilities with memory
4. **PDF Processing Service**: Extracts and indexes content from PDF documents
5. **Website Scraper Service**: Extracts and indexes content from websites
6. **Analytics Service**: Tracks conversation metrics and system performance

### API Routes

1. **/api/knowledge**: Endpoints for managing business knowledge
   - POST /api/knowledge/pdf: Upload and process PDF documents
   - POST /api/knowledge/website: Scrape and process website content
   - GET /api/knowledge/stats: Get knowledge base statistics

2. **/api/analytics**: Endpoints for analytics dashboard
   - GET /api/analytics/dashboard: Get dashboard metrics
   - POST /api/analytics/conversation: Log conversation data
   - POST /api/analytics/feedback: Record accuracy feedback

## Setup and Configuration

### Environment Variables

The system requires the following environment variables:

```
# WhatsApp Configuration
USE_MOCK_WHATSAPP=false
WHATSAPP_SESSION_DATA=

# GHL Configuration
GHL_API_KEY=
GHL_LOCATION_ID=

# AI Configuration
OPENAI_API_KEY=
AI_MODEL=gpt-4
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=500

# Database Configuration
SUPABASE_URL=
SUPABASE_KEY=

# Server Configuration
PORT=3000
```

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables
4. Start the server: `npm start`

## Knowledge Integration Features

### PDF Document Processing

The system can process PDF documents to extract business knowledge:

1. Upload PDF files through the dashboard or API
2. The system extracts text and metadata
3. Content is split into chunks and indexed in the knowledge base
4. AI responses incorporate relevant information from PDFs

### Website Content Scraping

The system can scrape website content to extract business knowledge:

1. Submit website URLs through the dashboard or API
2. The system scrapes text content from the website
3. Content is split into chunks and indexed in the knowledge base
4. AI responses incorporate relevant information from websites

## Conversation Memory System

The Enhanced AI Service maintains conversation memory:

1. Stores the last 10 conversations per user
2. Uses the last 5 conversations for context in AI responses
3. Includes user profile information in context
4. Retrieves relevant knowledge from the knowledge base

## Analytics Dashboard

The system includes an analytics dashboard at `/analytics` that provides:

1. Conversation volume trends
2. Response time metrics
3. Accuracy feedback
4. Recent conversations
5. Knowledge base statistics

## API Usage Examples

### Upload PDF Document

```javascript
// Example: Upload PDF document
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('metadata', JSON.stringify({
  title: 'Product Catalog',
  description: 'Company product information',
  category: 'products'
}));

fetch('/api/knowledge/pdf', {
  method: 'POST',
  body: formData,
  headers: {
    'x-api-key': 'your-api-key'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

### Scrape Website Content

```javascript
// Example: Scrape website content
fetch('/api/knowledge/website', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key'
  },
  body: JSON.stringify({
    url: 'https://www.example.com/about',
    metadata: {
      title: 'About Page',
      category: 'company'
    }
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

## Troubleshooting

### WhatsApp Connection Issues

1. Ensure the WhatsApp QR code has been scanned
2. Check that the WhatsApp session is active
3. Verify network connectivity

### AI Response Issues

1. Verify OpenAI API key is valid
2. Check AI model availability
3. Ensure knowledge base is properly indexed

### GHL Integration Issues

1. Verify GHL API key and location ID
2. Check webhook configuration in GHL
3. Ensure contact synchronization is working

## Maintenance

Regular maintenance tasks include:

1. Monitoring the analytics dashboard for performance issues
2. Updating the knowledge base with new business information
3. Reviewing conversation logs for AI training opportunities
4. Checking for system updates and security patches

## Support

For additional support, please contact the system administrator or refer to the project repository.