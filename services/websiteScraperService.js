const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const url = require('url');

class WebsiteScraperService {
  constructor(embeddingsService) {
    this.embeddingsService = embeddingsService;
    this.maxPages = 20; // Maximum pages to scrape per domain
    this.visitedUrls = new Set();
    this.chunkSize = 1500; // characters per chunk
    this.chunkOverlap = 200; // overlap between chunks
  }

  /**
   * Scrape content from a website URL
   * @param {string} websiteUrl - URL to scrape
   * @returns {Promise<{text: string, links: Array<string>, title: string}>}
   */
  async scrapeUrl(websiteUrl) {
    try {
      console.log(`🌐 Scraping URL: ${websiteUrl}`);
      const response = await axios.get(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Extract title
      const title = $('title').text().trim() || websiteUrl;
      
      // Extract main content
      // Remove script, style, nav, footer, and other non-content elements
      $('script, style, nav, footer, header, .header, .footer, .nav, .sidebar, .ad, .ads, .advertisement').remove();
      
      // Get text from body
      const bodyText = $('body').text()
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();
      
      // Extract links for further crawling
      const links = [];
      const baseUrl = new URL(websiteUrl);
      
      $('a').each((i, link) => {
        const href = $(link).attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          try {
            const absoluteUrl = new URL(href, websiteUrl).href;
            // Only include links from the same domain
            if (new URL(absoluteUrl).hostname === baseUrl.hostname) {
              links.push(absoluteUrl);
            }
          } catch (e) {
            // Invalid URL, skip
          }
        }
      });
      
      return {
        text: bodyText,
        links: [...new Set(links)], // Remove duplicates
        title
      };
    } catch (error) {
      console.error(`Error scraping URL ${websiteUrl}:`, error.message);
      return {
        text: '',
        links: [],
        title: websiteUrl
      };
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
   * Crawl a website and extract content from multiple pages
   * @param {string} startUrl - Starting URL for crawling
   * @param {string} category - Category for the knowledge
   * @param {string} description - Description of the website
   * @returns {Promise<Object>} - Crawling result
   */
  async crawlWebsite(startUrl, category = 'website', description = '') {
    try {
      console.log(`🕸️ Starting website crawl: ${startUrl}`);
      this.visitedUrls.clear();
      const baseUrl = new URL(startUrl);
      const domain = baseUrl.hostname;
      
      const urlsToVisit = [startUrl];
      const scrapedPages = [];
      const documentId = `website-${uuidv4()}`;
      
      while (urlsToVisit.length > 0 && this.visitedUrls.size < this.maxPages) {
        const currentUrl = urlsToVisit.shift();
        
        // Skip if already visited
        if (this.visitedUrls.has(currentUrl)) continue;
        
        // Mark as visited
        this.visitedUrls.add(currentUrl);
        
        // Scrape the page
        const { text, links, title } = await this.scrapeUrl(currentUrl);
        
        if (text) {
          scrapedPages.push({
            url: currentUrl,
            title,
            text,
            scrapedAt: new Date().toISOString()
          });
          
          // Add new links to visit
          for (const link of links) {
            if (!this.visitedUrls.has(link) && !urlsToVisit.includes(link)) {
              urlsToVisit.push(link);
            }
          }
        }
        
        // Pause between requests to avoid overloading the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Process and index all scraped content
      let totalChunks = 0;
      
      for (const page of scrapedPages) {
        const chunks = this.splitIntoChunks(page.text);
        totalChunks += chunks.length;
        
        // Index each chunk into embeddings
        for (let i = 0; i < chunks.length; i++) {
          await this.embeddingsService.indexText({
            conversationId: null,
            sourceType: 'website',
            sourceId: documentId,
            text: chunks[i],
            chunkMeta: { 
              title: page.title,
              url: page.url,
              category,
              description,
              chunkIndex: i,
              totalChunks: chunks.length,
              domain
            }
          });
        }
      }
      
      return {
        success: true,
        documentId,
        domain,
        pagesScraped: scrapedPages.length,
        totalChunks,
        description,
        category,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error crawling website:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = WebsiteScraperService;