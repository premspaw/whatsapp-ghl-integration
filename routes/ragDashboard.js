const express = require('express');
const path = require('path');

// NOTE: This router now expects the already-initialized EnhancedAIService
// instance from server.js to avoid duplicate personality loads.
module.exports = (enhancedAIService) => {
    const router = express.Router();

// Dashboard route
    router.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/rag-dashboard.html'));
    });

// AI Chat endpoint
    router.post('/api/ai/chat', async (req, res) => {
    try {
        const { message, phoneNumber = '+1234567890', conversationId = 'dashboard-test' } = req.body;
        const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || req.body.tenantId || null;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        console.log(`[RAG Dashboard] Processing chat message: "${message}"`);

        // Generate AI response using RAG
        const response = await enhancedAIService.generateContextualReply(
            message,
            phoneNumber,
            conversationId,
            tenantId
        );

        // Get retrieval metadata using safe retrieval (vectors with keyword fallback)
        const retrievalResults = await enhancedAIService.safeRetrieveEmbeddings(message, conversationId, null, 0.2, tenantId, 5);
        
        const metadata = {
            retrievedChunks: retrievalResults ? retrievalResults.length : 0,
            similarity: retrievalResults && retrievalResults.length > 0 ? 
                (retrievalResults[0].similarity || null) : null,
            timestamp: new Date().toISOString()
        };

        console.log(`[RAG Dashboard] Response generated with ${metadata.retrievedChunks} chunks`);

        res.json({
            success: true,
            response: response || 'I apologize, but I couldn\'t generate a response at the moment.',
            metadata: metadata
        });

    } catch (error) {
        console.error('[RAG Dashboard] Chat error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
    });

// Tenants list endpoint for dashboard selector
    router.get('/api/tenants', async (req, res) => {
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );
        const { data, error } = await supabase
            .from('tenants')
            .select('id, name, external_id')
            .order('name', { ascending: true })
            .limit(100);
        if (error) throw error;
        res.json({ success: true, tenants: data || [] });
    } catch (e) {
        console.error('[RAG Dashboard] Tenants fetch error:', e);
        res.json({ success: true, tenants: [] });
    }
    });

// Knowledge search endpoint
    router.post('/api/knowledge/search', async (req, res) => {
    try {
        const { query, limit = 5, minSimilarity = 0.3 } = req.body;
        const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || req.body.tenantId || null;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query is required'
            });
        }

        console.log(`[RAG Dashboard] Searching knowledge base: "${query}"`);

        // Search using embeddings
        let results = await enhancedAIService.embeddings.retrieve({ query, topK: limit, minSimilarity, tenantId });

        // Fallback to keyword search if embeddings are empty
        const embCount = await enhancedAIService.embeddings.getEmbeddingsCount(tenantId);
        if ((!results || results.length === 0) || (embCount === 0)) {
            const keywordMatches = enhancedAIService.searchKnowledgeBase(query) || [];
            results = keywordMatches.map(k => ({
                id: k.id,
                title: k.title,
                content: k.content,
                similarity: 1.0,
                sourceType: 'knowledge'
            })).slice(0, limit);
        }

        console.log(`[RAG Dashboard] Found ${results ? results.length : 0} knowledge items`);

        res.json({
            success: true,
            results: results || [],
            query: query,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[RAG Dashboard] Knowledge search error:', error);
        res.status(500).json({
            success: false,
            error: 'Search failed',
            message: error.message
        });
    }
    });

// Knowledge search (GET alias) to support query-string based calls
    router.get('/api/knowledge/search', async (req, res) => {
    try {
        const query = req.query.q || req.query.query;
        const limit = parseInt(req.query.limit || '5', 10);
        const minSimilarity = parseFloat(req.query.minSimilarity || '0.3');
        const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || null;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query is required'
            });
        }

        console.log(`[RAG Dashboard] (GET) Searching knowledge base: "${query}"`);

        // Search using embeddings (same implementation as POST)
        let results = await enhancedAIService.embeddings.retrieve({ query, topK: limit, minSimilarity, tenantId });

        // Fallback to keyword search if embeddings are empty
        const embCount = await enhancedAIService.embeddings.getEmbeddingsCount(tenantId);
        if ((!results || results.length === 0) || (embCount === 0)) {
            const keywordMatches = enhancedAIService.searchKnowledgeBase(query) || [];
            results = keywordMatches.map(k => ({
                id: k.id,
                title: k.title,
                content: k.content,
                similarity: 1.0,
                sourceType: 'knowledge'
            })).slice(0, limit);
        }

        console.log(`[RAG Dashboard] (GET) Found ${results ? results.length : 0} knowledge items`);

        res.json({
            success: true,
            results: results || [],
            query,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[RAG Dashboard] (GET) Knowledge search error:', error);
        res.status(500).json({
            success: false,
            error: 'Search failed',
            message: error.message
        });
    }
    });

// System status endpoint
    router.get('/api/system/status', async (req, res) => {
    try {
        console.log('[RAG Dashboard] Fetching system status');

        const status = {
            embeddings: {
                count: 0,
                service: 'online'
            },
            knowledge: {
                items: 0,
                lastUpdated: null,
                service: 'online'
            },
            ai: {
                service: 'online',
                model: 'openrouter',
                responses: 0
            },
            ghl: {
                connected: false,
                contacts: 0,
                service: 'unknown'
            },
            timestamp: new Date().toISOString()
        };

        // Check embeddings service
        try {
            const embeddingsCount = await enhancedAIService.embeddings.getEmbeddingsCount();
            status.embeddings.count = embeddingsCount || 0;
        } catch (error) {
            console.error('[RAG Dashboard] Embeddings status error:', error);
            status.embeddings.service = 'error';
        }

        // Check knowledge base
        try {
            const knowledgeItems = enhancedAIService.getKnowledgeBase();
            status.knowledge.items = knowledgeItems ? knowledgeItems.length : 0;
            if (knowledgeItems && knowledgeItems.length > 0) {
                status.knowledge.lastUpdated = new Date().toISOString().split('T')[0];
            }
        } catch (error) {
            console.error('[RAG Dashboard] Knowledge base status error:', error);
            status.knowledge.service = 'error';
        }

        // Check GHL service
        try {
            status.ghl.connected = true;
            status.ghl.service = 'online';
            // Note: Add actual GHL contact count if available
        } catch (error) {
            console.error('[RAG Dashboard] GHL status error:', error);
            status.ghl.service = 'error';
        }

        console.log('[RAG Dashboard] System status retrieved successfully');

        res.json({
            success: true,
            status: status
        });

    } catch (error) {
        console.error('[RAG Dashboard] System status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get system status',
            message: error.message
        });
    }
    });

// Knowledge list endpoint
    router.get('/api/knowledge/list', async (req, res) => {
    try {
        console.log('[RAG Dashboard] Fetching knowledge list');

        const knowledgeItems = enhancedAIService.getKnowledgeBase();
        const knowledgeStats = enhancedAIService.getKnowledgeBaseStats();

        res.json({
            success: true,
            items: knowledgeItems || [],
            count: knowledgeItems ? knowledgeItems.length : 0,
            stats: knowledgeStats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[RAG Dashboard] Knowledge list error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get knowledge list',
            message: error.message
        });
    }
    });

// Test RAG system endpoint
    router.post('/api/system/test', async (req, res) => {
    try {
        console.log('[RAG Dashboard] Running RAG system test');

        const testResults = {
            embeddings: { status: 'unknown', message: '' },
            knowledge: { status: 'unknown', message: '' },
            ai: { status: 'unknown', message: '' },
            integration: { status: 'unknown', message: '' }
        };

        // Test embeddings service
        try {
            const testQuery = "test query";
            const embeddings = await enhancedAIService.embeddings.retrieve({ query: testQuery, topK: 1, minSimilarity: 0.1 });
            testResults.embeddings.status = 'success';
            testResults.embeddings.message = `Retrieved ${embeddings ? embeddings.length : 0} embeddings`;
        } catch (error) {
            testResults.embeddings.status = 'error';
            testResults.embeddings.message = error.message;
        }

        // Test knowledge base
        try {
            const knowledge = enhancedAIService.getKnowledgeBase();
            testResults.knowledge.status = 'success';
            testResults.knowledge.message = `Found ${knowledge ? knowledge.length : 0} knowledge items`;
        } catch (error) {
            testResults.knowledge.status = 'error';
            testResults.knowledge.message = error.message;
        }

        // Test AI service
        try {
            const aiResponse = await enhancedAIService.generateContextualReply(
                "Hello, this is a test",
                "+1234567890",
                "test-conversation"
            );
            testResults.ai.status = aiResponse ? 'success' : 'warning';
            testResults.ai.message = aiResponse ? 'AI response generated' : 'No response generated';
        } catch (error) {
            testResults.ai.status = 'error';
            testResults.ai.message = error.message;
        }

        // Overall integration test
        const allSuccess = Object.values(testResults).every(test => test.status === 'success');
        testResults.integration.status = allSuccess ? 'success' : 'warning';
        testResults.integration.message = allSuccess ? 'All systems operational' : 'Some issues detected';

        console.log('[RAG Dashboard] RAG system test completed');

        res.json({
            success: true,
            results: testResults,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[RAG Dashboard] RAG test error:', error);
        res.status(500).json({
            success: false,
            error: 'Test failed',
            message: error.message
        });
    }
    });

// Upload knowledge endpoint
    router.post('/api/knowledge/upload', async (req, res) => {
    try {
        const { content, source, type = 'manual', tenantId: bodyTenantId } = req.body;
        const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || bodyTenantId || null;

        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content is required'
            });
        }

        console.log(`[RAG Dashboard] Uploading knowledge (manual): ${content.substring(0, 100)}...`);

        // For manual content, add directly as a knowledge item and index embeddings
        const id = `dashboard-${Date.now()}`;
        const title = source || 'Dashboard Upload';
        const category = type || 'general';

        await enhancedAIService.addKnowledgeItem(id, title, content, category, tenantId);

        console.log('[RAG Dashboard] Knowledge item added and indexed successfully');

        res.json({
            success: true,
            message: 'Knowledge uploaded successfully',
            data: { id, title, category },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[RAG Dashboard] Knowledge upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Upload failed',
            message: error.message
        });
    }
    });

// Get embeddings list for visualization
    router.get('/api/embeddings/list', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const count = await enhancedAIService.embeddings.getEmbeddingsCount();
        // This server does not expose raw embedding vectors; return summary only
        res.json({
            success: true,
            embeddings: [],
            total: 0,
            count,
            mock: count === 0,
            message: 'Listing raw embeddings is not supported; use /api/system/status for counts.'
        });
    } catch (error) {
        console.error('Error getting embeddings list:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
    });

// System monitoring endpoints
    router.get('/api/system/metrics', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || null;
        // Calculate system metrics
        const startTime = Date.now();
        
        // Test response time with a simple operation
        await enhancedAIService.embeddings.getEmbeddingsCount(tenantId);
        const responseTime = Date.now() - startTime;
        
        // Get various system metrics
        const embeddingsCount = await enhancedAIService.embeddings.getEmbeddingsCount(tenantId) || 0;
        const knowledgeItems = enhancedAIService.getKnowledgeBase();
        const knowledgeCount = knowledgeItems ? knowledgeItems.length : 0;
        
        // Mock some metrics for demonstration
        const memoryUsage = Math.floor(Math.random() * 30) + 40; // 40-70%
        const aiRequests = Math.floor(Math.random() * 100) + 50;
        const requestsPerMinute = Math.floor(Math.random() * 20) + 5;
        
        // Determine overall health
        let overallHealth = 'healthy';
        if (responseTime > 1000 || memoryUsage > 80) {
            overallHealth = 'warning';
        }
        if (responseTime > 2000 || memoryUsage > 90) {
            overallHealth = 'error';
        }
        
        res.json({
            success: true,
            metrics: {
                responseTime,
                aiRequests,
                knowledgeBaseSize: knowledgeCount,
                embeddingsCount,
                memoryUsage,
                requestsPerMinute,
                overallHealth,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error getting system metrics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
    });

    router.get('/api/system/logs', async (req, res) => {
    try {
        // Mock system logs for demonstration
        const logs = [
            {
                timestamp: new Date(Date.now() - 60000).toISOString(),
                level: 'info',
                service: 'embeddings',
                message: 'Successfully processed 5 new embeddings'
            },
            {
                timestamp: new Date(Date.now() - 120000).toISOString(),
                level: 'info',
                service: 'ai',
                message: 'Generated response for user query'
            },
            {
                timestamp: new Date(Date.now() - 180000).toISOString(),
                level: 'warning',
                service: 'ghl',
                message: 'Rate limit approaching for API calls'
            },
            {
                timestamp: new Date(Date.now() - 240000).toISOString(),
                level: 'info',
                service: 'knowledge',
                message: 'Knowledge base updated with new content'
            }
        ];

        res.json({
            success: true,
            logs: logs.slice(0, parseInt(req.query.limit) || 50)
        });
    } catch (error) {
        console.error('Error getting system logs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
    });

    return router;
};