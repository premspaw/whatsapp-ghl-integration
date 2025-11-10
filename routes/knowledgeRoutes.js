/**
 * Knowledge Routes for WhatsApp AI Chatbot
 * Handles PDF processing and website scraping endpoints
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

module.exports = function(enhancedAIService, pdfProcessingService, websiteScraperService) {
  // List knowledge items (alias for RAG dashboard list)
  router.get('/list', async (req, res) => {
    try {
      const items = enhancedAIService.getKnowledgeBase();
      const stats = enhancedAIService.getKnowledgeBaseStats ? enhancedAIService.getKnowledgeBaseStats() : {};
      res.status(200).json({
        success: true,
        items: items || [],
        count: items ? items.length : 0,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting knowledge list:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve knowledge list' });
    }
  });

  // Search knowledge items using embeddings with keyword fallback
  router.post('/search', async (req, res) => {
    try {
      const { query, limit = 5, minSimilarity = 0.3 } = req.body;
      if (!query) return res.status(400).json({ success: false, error: 'Query is required' });

      const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || req.body.tenantId || null;

      let results = [];
      if (enhancedAIService.embeddings && typeof enhancedAIService.embeddings.retrieve === 'function') {
        try {
          results = await enhancedAIService.embeddings.retrieve({ query, topK: limit, minSimilarity, tenantId });
        } catch (e) {
          results = [];
        }
      }

      if (!results || results.length === 0) {
        const keywordMatches = enhancedAIService.searchKnowledgeBase(query) || [];
        results = keywordMatches.map(k => ({
          id: k.id,
          title: k.title,
          content: k.content,
          similarity: 1.0,
          sourceType: 'knowledge'
        })).slice(0, limit);
      }

      res.status(200).json({ success: true, results, query, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Error searching knowledge:', error);
      res.status(500).json({ success: false, error: 'Failed to search knowledge' });
    }
  });

  // GET alias for search (query string)
  router.get('/search', async (req, res) => {
    try {
      const query = req.query.q || req.query.query;
      if (!query) return res.status(400).json({ success: false, error: 'Query is required' });
      const limit = parseInt(req.query.limit || '5', 10);
      const minSimilarity = parseFloat(req.query.minSimilarity || '0.3');
      const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || null;

      let results = [];
      if (enhancedAIService.embeddings && typeof enhancedAIService.embeddings.retrieve === 'function') {
        try {
          results = await enhancedAIService.embeddings.retrieve({ query, topK: limit, minSimilarity, tenantId });
        } catch (e) {
          results = [];
        }
      }

      if (!results || results.length === 0) {
        const keywordMatches = enhancedAIService.searchKnowledgeBase(query) || [];
        results = keywordMatches.map(k => ({
          id: k.id,
          title: k.title,
          content: k.content,
          similarity: 1.0,
          sourceType: 'knowledge'
        })).slice(0, limit);
      }

      res.status(200).json({ success: true, results, query, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Error searching knowledge (GET):', error);
      res.status(500).json({ success: false, error: 'Failed to search knowledge' });
    }
  });

  // Manual text upload (alias) – avoid file.path issues
  router.post('/upload', async (req, res) => {
    try {
      const { content, source, type = 'manual', tenantId: bodyTenantId } = req.body;
      const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || bodyTenantId || null;
      if (!content) return res.status(400).json({ success: false, error: 'Content is required' });

      const id = `api-upload-${Date.now()}`;
      const title = source || 'API Upload';
      const category = type || 'general';

      await enhancedAIService.addKnowledgeItem(id, title, content, category, tenantId);
      res.status(200).json({ success: true, message: 'Knowledge uploaded', data: { id, title, category } });
    } catch (error) {
      console.error('Error uploading knowledge:', error);
      res.status(500).json({ success: false, error: 'Failed to upload knowledge' });
    }
  });
  // Process and index PDF document (conditionally enabled)
  if (pdfProcessingService && typeof pdfProcessingService.processPDF === 'function') {
    router.post('/pdf', upload.single('pdf'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const metadata = {
          title: req.body.title || path.basename(req.file.originalname, '.pdf'),
          description: req.body.description || '',
          category: req.body.category || 'general',
          tags: req.body.tags ? req.body.tags.split(',') : []
        };

        const result = await pdfProcessingService.processPDF(req.file.path, metadata);
        
        // Delete the file after processing
        fs.unlinkSync(req.file.path);
        
        res.status(200).json({
          success: true,
          message: 'PDF processed successfully',
          documentId: result.documentId,
          chunks: result.chunks.length
        });
      } catch (error) {
        console.error('Error processing PDF:', error);
        res.status(500).json({ error: 'Failed to process PDF' });
      }
    });
  } else {
    // Respond with 501 if PDF service is unavailable
    router.post('/pdf', upload.single('pdf'), async (req, res) => {
      return res.status(501).json({
        success: false,
        error: 'PDF upload is temporarily disabled on this server'
      });
    });
  }

  // Scrape and index website content
  router.post('/website', async (req, res) => {
    try {
      const { url, maxDepth, category, tags } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const metadata = {
        source: url,
        category: category || 'website',
        tags: tags ? tags.split(',') : []
      };

      const result = await websiteScraperService.scrapeWebsite(
        url, 
        parseInt(maxDepth || '2'), 
        metadata
      );
      
      res.status(200).json({
        success: true,
        message: 'Website content processed successfully',
        pagesProcessed: result.pagesProcessed,
        chunks: result.chunks.length
      });
    } catch (error) {
      console.error('Error processing website:', error);
      res.status(500).json({ error: 'Failed to process website content' });
    }
  });

  // Get knowledge base statistics
  router.get('/stats', async (req, res) => {
    try {
      const stats = await enhancedAIService.getKnowledgeBaseStats();
      res.status(200).json(stats);
    } catch (error) {
      console.error('Error getting knowledge base stats:', error);
      res.status(500).json({ error: 'Failed to retrieve knowledge base statistics' });
    }
  });

  return router;
};