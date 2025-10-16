# OpenRouter Setup Guide

## 🚀 What is OpenRouter?

OpenRouter is a unified API that provides access to multiple AI models from different providers through a single interface. This gives you access to models like Claude, GPT-4, Llama, and many others.

## 🔑 Getting Your OpenRouter API Key

### 1. Sign Up for OpenRouter
1. Go to [OpenRouter.ai](https://openrouter.ai)
2. Create an account
3. Navigate to your API keys section
4. Generate a new API key

### 2. Configure Your Environment
```env
# OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
OPENROUTER_MODEL=anthropic/claude-3-haiku
OPENROUTER_REFERER=http://localhost:3000
```

## 🤖 Available Models

### Recommended Models for WhatsApp Integration

| Model | Provider | Cost | Speed | Quality | Best For |
|-------|----------|------|-------|---------|----------|
| `anthropic/claude-3-haiku` | Anthropic | Low | Fast | High | General conversations |
| `anthropic/claude-3-sonnet` | Anthropic | Medium | Medium | Very High | Complex reasoning |
| `openai/gpt-4o-mini` | OpenAI | Low | Fast | High | Quick responses |
| `openai/gpt-4o` | OpenAI | High | Medium | Very High | Complex tasks |
| `meta-llama/llama-3.1-8b-instruct` | Meta | Very Low | Fast | Good | Budget option |
| `google/gemini-pro` | Google | Low | Fast | High | Balanced performance |

### Model Selection Guide

#### For Customer Support
```env
OPENROUTER_MODEL=anthropic/claude-3-haiku
```
- Fast responses
- Good understanding of context
- Cost-effective

#### For Sales Conversations
```env
OPENROUTER_MODEL=anthropic/claude-3-sonnet
```
- Better reasoning capabilities
- More persuasive responses
- Handles complex objections

#### For High-Volume Operations
```env
OPENROUTER_MODEL=openai/gpt-4o-mini
```
- Very fast responses
- Low cost
- Good for simple queries

## ⚙️ Configuration Options

### Basic Configuration
```env
# Required
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional - defaults shown
OPENROUTER_MODEL=anthropic/claude-3-haiku
OPENROUTER_REFERER=http://localhost:3000
```

### Advanced Configuration
```env
# Model selection
OPENROUTER_MODEL=anthropic/claude-3-sonnet

# Custom referer (for tracking)
OPENROUTER_REFERER=https://yourdomain.com

# Rate limiting (if needed)
OPENROUTER_MAX_REQUESTS_PER_MINUTE=60
```

## 🎯 Use Cases by Model

### Claude 3 Haiku (Recommended)
- **Best for**: General customer support, quick responses
- **Strengths**: Fast, cost-effective, good context understanding
- **Use when**: High volume, simple to medium complexity

### Claude 3 Sonnet
- **Best for**: Sales conversations, complex support
- **Strengths**: Excellent reasoning, persuasive responses
- **Use when**: Quality over speed, complex scenarios

### GPT-4o Mini
- **Best for**: Budget-conscious operations
- **Strengths**: Very fast, very cheap
- **Use when**: Simple queries, high volume

### GPT-4o
- **Best for**: Complex reasoning tasks
- **Strengths**: Highest quality responses
- **Use when**: Complex support, technical issues

## 💰 Cost Comparison

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Typical Cost per Message |
|-------|----------------------|------------------------|-------------------------|
| Claude 3 Haiku | $0.25 | $1.25 | $0.001-0.005 |
| Claude 3 Sonnet | $3.00 | $15.00 | $0.01-0.05 |
| GPT-4o Mini | $0.15 | $0.60 | $0.0005-0.002 |
| GPT-4o | $5.00 | $15.00 | $0.02-0.08 |

## 🔧 Implementation Examples

### Basic Setup
```javascript
// In your .env file
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=anthropic/claude-3-haiku
```

### Model Switching
```javascript
// Switch models based on conversation type
const modelMap = {
  'support': 'anthropic/claude-3-haiku',
  'sales': 'anthropic/claude-3-sonnet',
  'general': 'openai/gpt-4o-mini'
};
```

### Custom Prompts by Model
```javascript
const prompts = {
  'claude': 'You are a helpful assistant...',
  'gpt': 'You are a helpful assistant...',
  'llama': 'You are a helpful assistant...'
};
```

## 🚨 Error Handling

### Common Issues

1. **Invalid API Key**
   ```
   Error: 401 Unauthorized
   Solution: Check your API key in .env file
   ```

2. **Model Not Available**
   ```
   Error: Model not found
   Solution: Check model name spelling
   ```

3. **Rate Limit Exceeded**
   ```
   Error: 429 Too Many Requests
   Solution: Implement rate limiting
   ```

4. **Insufficient Credits**
   ```
   Error: Insufficient credits
   Solution: Add credits to your OpenRouter account
   ```

## 📊 Monitoring and Analytics

### Track Usage
```javascript
// Log model usage for analytics
console.log('AI Reply generated:', {
  model: this.model,
  tokens: response.data.usage,
  cost: calculateCost(response.data.usage)
});
```

### Cost Monitoring
```javascript
// Track costs per conversation
const costTracker = {
  totalTokens: 0,
  totalCost: 0,
  conversations: []
};
```

## 🔄 Migration from OpenAI

### If you're currently using OpenAI:

1. **Keep both configurations**:
   ```env
   # OpenRouter (new)
   OPENROUTER_API_KEY=sk-or-v1-your-key
   OPENROUTER_MODEL=anthropic/claude-3-haiku
   
   # OpenAI (fallback)
   OPENAI_API_KEY=sk-your-openai-key
   ```

2. **Add fallback logic**:
   ```javascript
   // Try OpenRouter first, fallback to OpenAI
   if (openRouterAvailable) {
     return await openRouter.generateReply(message);
   } else {
     return await openAI.generateReply(message);
   }
   ```

## 🎯 Best Practices

### 1. Model Selection
- Start with Claude 3 Haiku for general use
- Upgrade to Sonnet for complex scenarios
- Use GPT-4o Mini for high-volume operations

### 2. Cost Optimization
- Use appropriate models for task complexity
- Implement conversation length limits
- Cache common responses

### 3. Performance
- Monitor response times
- Implement retry logic
- Use appropriate timeouts

### 4. Quality Control
- Test different models
- Monitor response quality
- Adjust prompts per model

## 🚀 Getting Started

1. **Get OpenRouter API Key**:
   - Sign up at [OpenRouter.ai](https://openrouter.ai)
   - Generate API key
   - Add credits to account

2. **Configure Environment**:
   ```bash
   # Update .env file
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   OPENROUTER_MODEL=anthropic/claude-3-haiku
   ```

3. **Test the Integration**:
   ```bash
   npm start
   # Test with mock WhatsApp
   # Verify AI replies work
   ```

4. **Monitor and Optimize**:
   - Check response quality
   - Monitor costs
   - Adjust model as needed

## 📞 Support

- **OpenRouter Documentation**: [OpenRouter.ai/docs](https://openrouter.ai/docs)
- **Model Comparison**: [OpenRouter.ai/models](https://openrouter.ai/models)
- **Pricing**: [OpenRouter.ai/pricing](https://openrouter.ai/pricing)
- **Community**: [OpenRouter Discord](https://discord.gg/openrouter)
