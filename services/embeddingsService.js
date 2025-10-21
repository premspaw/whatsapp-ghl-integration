const axios = require('axios');
const { insertEmbedding, matchEmbeddings } = require('./db/embeddingRepo');

class EmbeddingsService {
  constructor() {
    this.provider = process.env.OPENROUTER_EMBEDDINGS_PROVIDER || 'openai';
    this.model = process.env.OPENROUTER_EMBEDDINGS_MODEL || 'text-embedding-3-small';
    this.openrouterKey = process.env.OPENROUTER_API_KEY;
    this.openrouterBase = 'https://openrouter.ai/api/v1';
    this.chunkSize = 900; // chars
    this.chunkOverlap = 150; // chars
  }

  chunkText(text) {
    if (!text) return [];
    const chunks = [];
    let i = 0;
    while (i < text.length) {
      const end = Math.min(i + this.chunkSize, text.length);
      const chunk = text.slice(i, end);
      chunks.push(chunk);
      if (end === text.length) break;
      i = end - this.chunkOverlap;
      if (i < 0) i = 0;
    }
    return chunks;
  }

  async embedTexts(texts) {
    if (!texts || texts.length === 0) return [];
    if (!this.openrouterKey) throw new Error('OPENROUTER_API_KEY missing for embeddings');
    const input = texts;
    const res = await axios.post(`${this.openrouterBase}/embeddings`, {
      model: this.model,
      input
    }, {
      headers: {
        'Authorization': `Bearer ${this.openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
        'X-Title': 'WhatsApp GHL Integration Embeddings'
      }
    });
    const vectors = res.data.data.map(d => d.embedding);
    return vectors;
  }

  async indexText({ conversationId = null, sourceType, sourceId, text, chunkMeta = {} }) {
    const chunks = this.chunkText(text);
    if (chunks.length === 0) return { inserted: 0 };
    const embeddings = await this.embedTexts(chunks);
    for (let i = 0; i < chunks.length; i++) {
      await insertEmbedding({
        conversationId,
        sourceType,
        sourceId: `${sourceId}#${i}`,
        text: chunks[i],
        embedding: embeddings[i],
        chunkMeta
      });
    }
    return { inserted: chunks.length };
  }

  async retrieve({ query, topK = 5, conversationId = null }) {
    const [embedding] = await this.embedTexts([query]);
    const results = await matchEmbeddings({ queryEmbedding: embedding, matchCount: topK, conversationId });
    return results;
  }
}

module.exports = EmbeddingsService;


