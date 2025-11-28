require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createAgent } = require("./agent");
const { normalizePayload, formatWhatsAppRequest, sendWhatsAppMessage } = require("./utils");
const db = require("./db");
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files for UI
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// Track stats
let totalRequests = 0;
let agentReady = false;

// Initialize Agent
let agentExecutor;
createAgent().then((executor) => {
    agentExecutor = executor;
    agentReady = true;
    console.log("AI Agent initialized");
}).catch(err => {
    console.error("Failed to initialize agent:", err.message);
});

// Helper to log to file
function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    try {
        fs.appendFileSync(path.join(__dirname, 'server.log'), logMessage);
    } catch (err) {
        console.error("Error writing to log file:", err);
    }
    console.log(message);
}

// API Routes for Dashboard

// Get server status
app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        agentReady,
        totalRequests
    });
});

// Get configuration (masked)
app.get('/api/config', (req, res) => {
    res.json({
        openrouterKey: process.env.OPENROUTER_API_KEY ? true : false,
        pineconeKey: process.env.PINECONE_API_KEY ? true : false,
        ghlKey: process.env.GHL_API_KEY ? true : false,
        synthcoreKey: process.env.SYNTHCORE_API_KEY ? true : false
    });
});

// Save configuration
app.post('/api/config', (req, res) => {
    try {
        const { openrouterKey, pineconeKey, ghlKey, synthcoreKey } = req.body;

        // Read current .env file
        const envPath = path.join(__dirname, '.env');
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

        // Update or add keys
        const updateEnv = (key, value) => {
            if (!value || value === '••••••••') return; // Skip if unchanged
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${key}=${value}`);
            } else {
                envContent += `\n${key}=${value}`;
            }
        };

        updateEnv('OPENROUTER_API_KEY', openrouterKey);
        updateEnv('PINECONE_API_KEY', pineconeKey);
        updateEnv('GHL_API_KEY', ghlKey);
        updateEnv('SYNTHCORE_API_KEY', synthcoreKey);

        // Write back to .env
        fs.writeFileSync(envPath, envContent.trim() + '\n');

        res.json({ success: true, message: 'Configuration saved. Restart server to apply changes.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get server logs
app.get('/api/logs', (req, res) => {
    try {
        const logPath = path.join(__dirname, 'server.log');
        if (fs.existsSync(logPath)) {
            const logs = fs.readFileSync(logPath, 'utf8');
            // Return last 100 lines
            const lines = logs.split('\n').filter(l => l.trim()).slice(-100);
            res.json({ logs: lines });
        } else {
            res.json({ logs: [] });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get recent messages from Supabase
app.get('/api/messages', async (req, res) => {
    try {
        const { phone, limit = 50 } = req.query;
        // For now, return a placeholder - you can implement this later
        res.json({ messages: [], note: "Feature coming soon" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current system prompt
app.get('/api/prompt', (req, res) => {
    try {
        const agentPath = path.join(__dirname, 'agent.js');
        const agentCode = fs.readFileSync(agentPath, 'utf8');

        // Extract system message from agent.js
        const match = agentCode.match(/const systemMessage = `([\s\S]*?)`;/);
        if (match) {
            res.json({ prompt: match[1] });
        } else {
            res.status(404).json({ error: 'Could not extract prompt' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update system prompt
app.post('/api/prompt', (req, res) => {
    try {
        const { prompt } = req.body;
        const agentPath = path.join(__dirname, 'agent.js');
        let agentCode = fs.readFileSync(agentPath, 'utf8');

        // Replace the system message
        agentCode = agentCode.replace(
            /const systemMessage = `[\s\S]*?`;/,
            `const systemMessage = \`${prompt}\`;`
        );

        fs.writeFileSync(agentPath, agentCode);
        res.json({ success: true, message: 'Prompt updated. Restart server to apply changes.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Webhook endpoint
app.post("/webhook/whatsapp", async (req, res) => {
    totalRequests++;
    logToFile("\n--- Incoming Webhook ---");

    try {
        // 1. Normalize Payload
        const normalized = normalizePayload(req.body);
        const { phone, contactName, text } = normalized;

        if (!phone || !text) {
            logToFile("Invalid payload: Missing phone or text");
            return res.status(200).send("No text message received");
        }

        logToFile(`From: ${contactName} (${phone})`);
        logToFile(`Message: ${text}`);

        // Save incoming user message to Supabase
        await db.saveMessage(phone, 'user', text);

        // Send immediate 200 OK to acknowledge receipt
        res.status(200).json({ status: "ok" });

        // 2. Run AI Agent
        if (!agentExecutor) {
            logToFile("Agent not ready, skipping processing");
            return;
        }

        // Get chat history for context
        const history = await db.getChatHistory(phone, 6);
        const historyText = history.map(msg => `${msg.role}: ${msg.content}`).join('\n');

        logToFile("Processing with AI Agent...");
        const result = await agentExecutor.invoke({
            input: text,
            chat_history: historyText,
            phone: phone,
            contactName: contactName || "User",
            tenantId: "default"
        });

        const aiResponse = result.output;
        logToFile(`AI Response: ${aiResponse}`);

        // Save AI response to Supabase
        await db.saveMessage(phone, 'assistant', aiResponse);

        // 3. Send Response via WhatsApp API
        const sendResult = await sendWhatsAppMessage(phone, aiResponse);
        logToFile(`WhatsApp Send Result: ${JSON.stringify(sendResult)}`);

    } catch (error) {
        logToFile(`Error processing webhook: ${error.message}`);
        console.error(error);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
