const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const config = require('./config/env');
const logger = require('./utils/logger');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Basic Routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/webhooks', require('./routes/webhooks'));
const whatsappRoutes = require('./routes/whatsapp');
const templateRoutes = require('./routes/templates');
const billingRoutes = require('./routes/billing');
const loyaltyRoutes = require('./routes/loyalty');
const ghlRoutes = require('./routes/ghl');

app.use('/api/v1/whatsapp', whatsappRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/loyalty', loyaltyRoutes);
app.use('/api/v1/ghl', ghlRoutes);

// Initialize Services
const whatsappManager = require('./services/whatsapp/manager');
whatsappManager.initializeAll();

// Start Server
server.listen(config.port, () => {
    logger.info(`🚀 Server running on port ${config.port} in ${config.env} mode`);
});

// Handle Shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        logger.info('Server closed.');
        process.exit(0);
    });
});

module.exports = { app, server };
