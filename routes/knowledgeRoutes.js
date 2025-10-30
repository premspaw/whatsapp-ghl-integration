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
  // Process and index PDF document
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