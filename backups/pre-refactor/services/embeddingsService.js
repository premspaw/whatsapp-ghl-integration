const axios = require('axios');
const { insertEmbedding, matchEmbeddings } = require('./db/embeddingRepo');

class EmbeddingsService {
  constructor() {
    this.provider = process.env.OPENROUTER_EMBEDDINGS_PROVIDER || 'openai';
    this.model = process.env.OPENROUTER_EMBEDDINGS_MODEL || 'text-embedding-3-small';
    this.openrouterKey = process.env.OPENROUTER_API_KEY;
    this.openrouterBase = 'https://openrouter.ai/api/v1';
    this.chunkSize = 1000; // Increased from 900 for better context
    this.chunkOverlap = 200; // Increased from 150 for better continuity
    this.maxChunkSize = 8000; // Maximum chunk size for very long documents
  }

  // Enhanced chunking with sentence boundary awareness
  chunkText(text, options = {}) {
    if (!text) return [];
    
    const {
      chunkSize = this.chunkSize,
      chunkOverlap = this.chunkOverlap,
      respectSentences = true
    } = options;
    
    const chunks = [];
    
    // For very long text, use paragraph-based chunking
    if (text.length > this.maxChunkSize) {
      return this.chunkByParagraphs(text, chunkSize, chunkOverlap);
    }
    
    let i = 0;
    while (i < text.length) {
      let end = Math.min(i + chunkSize, text.length);
      
      // Try to break at sentence boundaries for better context
      if (respectSentences && end < text.length) {
        const sentenceEnd = this.findSentenceBoundary(text, end, i + chunkSize * 0.7);
        if (sentenceEnd > i) {
          end = sentenceEnd;
        }
      }
      
      const chunk = text.slice(i, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      
      if (end === text.length) break;
      
      // Calculate next starting position with overlap
      i = end - chunkOverlap;
      if (i < 0) i = 0;
    }
    
    return chunks;
  }

  // Find the best sentence boundary for chunking
  findSentenceBoundary(text, preferredEnd, minEnd) {
    const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
    let bestEnd = -1;
    
    // Look backwards from preferred end to find sentence boundary
    for (let i = preferredEnd; i >= minEnd; i--) {
      for (const ender of sentenceEnders) {
        if (text.substring(i, i + ender.length) === ender) {
          bestEnd = i + ender.length;
          break;
        }
      }
      if (bestEnd > 0) break;
    }
    
    return bestEnd > 0 ? bestEnd : preferredEnd;
  }

  // Chunk by paragraphs for very long documents
  chunkByParagraphs(text, chunkSize, chunkOverlap) {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks = [];
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) continue;
      
      // If adding this paragraph would exceed chunk size, save current chunk
      if (currentChunk.length + trimmedParagraph.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // Start new chunk with overlap from previous chunk
        const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
        currentChunk = overlapText + '\n\n' + trimmedParagraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
      }
    }
    
    // Add the last chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  // Get overlap text from the end of a chunk
  getOverlapText(text, overlapSize) {
    if (text.length <= overlapSize) return text;
    
    const overlapText = text.slice(-overlapSize);
    // Try to start at a sentence boundary
    const sentenceStart = overlapText.search(/[.!?]\s+/);
    if (sentenceStart > 0) {
      return overlapText.slice(sentenceStart + 2);
    }
    
    return overlapText;
  }

  async embedTexts(texts) {
    if (!texts || texts.length === 0) return [];
    if (!this.openrouterKey) throw new Error('OPENROUTER_API_KEY missing for embeddings');
    
    // Process in batches to avoid API limits
    const batchSize = 100;
    const allEmbeddings = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      try {
        const res = await axios.post(`${this.openrouterBase}/embeddings`, {
          model: this.model,
          input: batch
        }, {
          headers: {
            'Authorization': `Bearer ${this.openrouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
            'X-Title': 'WhatsApp GHL Integration Embeddings'
          }
        });
        
        const vectors = res.data.data.map(d => d.embedding);
        allEmbeddings.push(...vectors);
        
        // Small delay between batches to be respectful to the API
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error embedding batch ${i}-${i + batch.length}:`, error.message);
        // Add empty embeddings for failed batch
        allEmbeddings.push(...new Array(batch.length).fill(null));
      }
    }
    
    return allEmbeddings;
  }

  async indexText({ conversationId = null, sourceType, sourceId, text, chunkMeta = {}, tenantId = null }) {
    const chunks = this.chunkText(text, {
      respectSentences: sourceType === 'document' // Use sentence-aware chunking for documents
    });
    
    if (chunks.length === 0) return { inserted: 0 };
    
    console.log(`📚 Chunking text into ${chunks.length} pieces for indexing`);
    
    const embeddings = await this.embedTexts(chunks);
    let insertedCount = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      if (embeddings[i]) { // Only insert if embedding was successful
        try {
          await insertEmbedding({
            conversationId,
            sourceType,
            sourceId: `${sourceId}#${i}`,
            text: chunks[i],
            embedding: embeddings[i],
            chunkMeta: {
              ...chunkMeta,
              chunkIndex: i,
              totalChunks: chunks.length,
              chunkLength: chunks[i].length
            },
            tenantId
          });
          insertedCount++;
        } catch (insertError) {
          console.error(`Error inserting chunk ${i}:`, insertError.message);
        }
      }
    }
    
    console.log(`📚 Successfully indexed ${insertedCount}/${chunks.length} chunks`);
    return { inserted: insertedCount, total: chunks.length };
  }

  async retrieve({ query, topK = 5, conversationId = null, minSimilarity = 0.7, tenantId = null }) {
    try {
      const [embedding] = await this.embedTexts([query]);
      if (!embedding) {
        console.warn('Failed to generate embedding for query');
        return [];
      }
      
      const results = await matchEmbeddings({ 
        queryEmbedding: embedding, 
        matchCount: topK * 2, // Get more results to filter by similarity
        conversationId,
        tenantId
      });
      
      // Calculate similarity from distance (database returns distance, not similarity)
      const resultsWithSimilarity = results.map(result => ({
        ...result,
        similarity: result.distance !== undefined ? (1 - result.distance) : 0
      }));

      // Minimal metadata filter for tenant strictness
      const strictTenant = String(process.env.RETRIEVE_TENANT_STRICT || '').toLowerCase() === 'true';
      const tagKeys = String(process.env.TENANT_META_TAG_KEYS || 'tenant_tags,allowed_tenants,tags')
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);
      const tagPrefix = String(process.env.TENANT_TAG_PREFIX || 'Location:');

      function hasTenantMatch(meta, tId) {
        try {
          if (!meta || !tId) return false;
          const directKeys = ['tenantId', 'tenant_id', 'tenant', 'tenant_name'];
          for (const key of directKeys) {
            if (meta[key] && String(meta[key]).trim() === String(tId).trim()) return true;
          }
          // Check tag arrays
          for (const k of tagKeys) {
            const val = meta[k];
            if (Array.isArray(val)) {
              if (val.includes(tId)) return true;
              // Also support prefixed tags, e.g., Location:SYNTHCORE
              if (val.some(v => String(v).toLowerCase() === String(`${tagPrefix}${tId}`).toLowerCase())) return true;
            } else if (typeof val === 'string') {
              const s = String(val);
              if (s === tId) return true;
              if (s.toLowerCase() === String(`${tagPrefix}${tId}`).toLowerCase()) return true;
            }
          }
        } catch (_) {}
        return false;
      }

      let filtered = resultsWithSimilarity;
      if (tenantId) {
        if (strictTenant) {
          // Enforce strict match by tenant column or metadata
          filtered = resultsWithSimilarity.filter(r => {
            return r.tenant_id === tenantId || hasTenantMatch(r.chunk_meta, tenantId);
          });
        } else {
          // Soft preference: boost similarity for tenant matches
          filtered = resultsWithSimilarity
            .map(r => {
              const boost = (r.tenant_id === tenantId || hasTenantMatch(r.chunk_meta, tenantId)) ? 0.05 : 0;
              return { ...r, similarity: Math.min(1, r.similarity + boost) };
            });
        }
      }
      
      // Filter by minimum similarity and return top results
      const filteredResults = filtered
        .filter(result => result.similarity >= minSimilarity)
        .slice(0, topK);
      
      console.log(`🔍 Retrieved ${filteredResults.length} relevant chunks (similarity >= ${minSimilarity})`);
      return filteredResults;
    } catch (error) {
      console.error('Error retrieving embeddings:', error);
      return [];
    }
  }

  // Get total count of embeddings in the database
  async getEmbeddingsCount(tenantId = null) {
    try {
      const { getSupabase } = require('./db/supabaseClient');
      const supabase = getSupabase();
      if (!supabase) return 0;

      let query = supabase
        .from('ai_embeddings')
        .select('*', { count: 'exact', head: true });

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error getting embeddings count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting embeddings count:', error);
      return 0;
    }
  }

  // Get embeddings statistics
  async getEmbeddingsStats(tenantId = null) {
    try {
      const { getSupabase } = require('./db/supabaseClient');
      const supabase = getSupabase();
      if (!supabase) return { total: 0, bySource: {}, byType: {} };

      let query = supabase
        .from('ai_embeddings')
        .select('source_type, source_id, created_at');

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting embeddings stats:', error);
        return { total: 0, bySource: {}, byType: {} };
      }

      const stats = {
        total: data?.length || 0,
        bySource: {},
        byType: {}
      };

      if (data) {
        data.forEach(item => {
          // Count by source type
          const sourceType = item.source_type || 'unknown';
          stats.byType[sourceType] = (stats.byType[sourceType] || 0) + 1;

          // Count by source ID
          const sourceId = item.source_id || 'unknown';
          stats.bySource[sourceId] = (stats.bySource[sourceId] || 0) + 1;
        });
      }

      return stats;
    } catch (error) {
      console.error('Error getting embeddings stats:', error);
      return { total: 0, bySource: {}, byType: {} };
    }
  }
}

module.exports = EmbeddingsService;


