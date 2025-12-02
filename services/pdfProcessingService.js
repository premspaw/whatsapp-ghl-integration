const fs = require('fs').promises;
const path = require('path');
// Optional imports with graceful fallbacks to avoid startup crashes
let pdf;
try {
  pdf = require('pdf-parse');
} catch (e) {
  pdf = null;
}

let uuidv4;
try {
  uuidv4 = require('uuid').v4;
} catch (e) {
  // Fallback UUID generator if 'uuid' isn't installed
  uuidv4 = () => `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

class PDFProcessingService {
  constructor(embeddingsService) {
    this.embeddingsService = embeddingsService;
    this.uploadDir = path.join(__dirname, '..', 'uploads', 'knowledge');
    this.chunkSize = 1000; // characters per chunk
    this.chunkOverlap = 200; // overlap between chunks
  }

  /**
   * Process a PDF file and extract its content
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<{text: string, metadata: Object}>}
   */
  async processPDF(filePath) {
    try {
      if (!pdf) {
        throw new Error('pdf-parse module is not installed. PDF processing is temporarily disabled.');
      }
      // Read the PDF file
      const dataBuffer = await fs.readFile(filePath);
      
      // Parse the PDF content
      const data = await pdf(dataBuffer);
      
      // Extract metadata
      const metadata = {
        title: path.basename(filePath, '.pdf'),
        pageCount: data.numpages,
        info: data.info,
        version: data.version,
        processedAt: new Date().toISOString()
      };
      
      return {
        text: data.text,
        metadata
      };
    } catch (error) {
      console.error('Error processing PDF:', error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }

  /**
   * Split text into chunks for embedding
   * @param {string} text - Text to split
   * @returns {Array<string>} - Array of text chunks
   */
  splitIntoChunks(text) {
    const chunks = [];
    let currentPosition = 0;
    
    while (currentPosition < text.length) {
      const chunk = text.substring(
        currentPosition, 
        Math.min(currentPosition + this.chunkSize, text.length)
      );
      
      chunks.push(chunk);
      currentPosition += this.chunkSize - this.chunkOverlap;
      
      // Avoid infinite loop if chunk size is too small
      if (currentPosition <= 0) break;
    }
    
    return chunks;
  }

  /**
   * Process a PDF file and add it to the knowledge base
   * @param {string} filePath - Path to the PDF file
   * @param {string} category - Category for the knowledge
   * @param {string} description - Description of the document
   * @returns {Promise<Object>} - Processing result
   */
  async addPDFToKnowledgeBase(filePath, category = 'general', description = '') {
    try {
      // Process the PDF
      const { text, metadata } = await this.processPDF(filePath);
      
      // Generate a unique ID for this document
      const documentId = `pdf-${uuidv4()}`;
      
      // Split text into chunks
      const chunks = this.splitIntoChunks(text);
      
      // Index each chunk into embeddings
      for (let i = 0; i < chunks.length; i++) {
        await this.embeddingsService.indexText({
          conversationId: null,
          sourceType: 'pdf_document',
          sourceId: documentId,
          text: chunks[i],
          chunkMeta: { 
            title: metadata.title,
            category,
            description,
            chunkIndex: i,
            totalChunks: chunks.length,
            pageInfo: `Document with ${metadata.pageCount} pages`
          }
        });
      }
      
      return {
        success: true,
        documentId,
        title: metadata.title,
        pageCount: metadata.pageCount,
        chunkCount: chunks.length,
        description,
        category,
        processedAt: metadata.processedAt
      };
    } catch (error) {
      console.error('Error adding PDF to knowledge base:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process multiple PDF files
   * @param {Array<string>} filePaths - Array of file paths
   * @param {string} category - Category for the knowledge
   * @param {string} description - Description of the documents
   * @returns {Promise<Array<Object>>} - Array of processing results
   */
  async processBatchPDFs(filePaths, category = 'general', description = '') {
    const results = [];
    
    for (const filePath of filePaths) {
        
      try {
        const result = await this.addPDFToKnowledgeBase(filePath, category, description);
        results.push({
          filePath,
          ...result
        });
      } catch (error) {
        results.push({
          filePath,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = PDFProcessingService;