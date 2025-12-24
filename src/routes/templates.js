const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const TEMPLATES_FILE = path.join(process.cwd(), 'data', 'templates.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(TEMPLATES_FILE))) {
    fs.mkdirSync(path.dirname(TEMPLATES_FILE), { recursive: true });
}

// Ensure templates file exists
if (!fs.existsSync(TEMPLATES_FILE)) {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify({}, null, 2));
}

function loadTemplates() {
    try {
        const data = fs.readFileSync(TEMPLATES_FILE, 'utf8');
        return JSON.parse(data || '{}');
    } catch (error) {
        logger.error('Error loading templates:', error);
        return {};
    }
}

function saveTemplates(templates) {
    try {
        fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
        return true;
    } catch (error) {
        logger.error('Error saving templates:', error);
        return false;
    }
}

// GET /api/templates
router.get('/', (req, res) => {
    try {
        const locationId = req.query.location_id || req.query.locationId || 'default';
        const allTemplates = loadTemplates();

        // Filter templates by locationId
        const templates = Object.values(allTemplates).filter(t => t.locationId === locationId);

        res.json({ success: true, templates });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/templates/:id
router.get('/:id', (req, res) => {
    try {
        const templates = loadTemplates();
        const template = templates[req.params.id];
        if (template) {
            res.json({ success: true, template });
        } else {
            res.status(404).json({ success: false, error: 'Template not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/templates
router.post('/', (req, res) => {
    try {
        const { id, name, content, category, mediaUrl, mediaType, locationId } = req.body;
        const targetLocationId = locationId || req.query.location_id || 'default';

        if (!name || !content) {
            return res.status(400).json({ success: false, error: 'Name and content are required' });
        }

        const templates = loadTemplates();
        const templateId = id || `tpl_${Date.now()}`;

        templates[templateId] = {
            id: templateId,
            locationId: targetLocationId, // Store mapping
            name,
            content,
            category: category || 'general',
            mediaUrl,
            mediaType,
            createdAt: templates[templateId]?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (saveTemplates(templates)) {
            res.json({ success: true, template: templates[templateId] });
        } else {
            res.status(500).json({ success: false, error: 'Failed to save template' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/templates/:id
router.delete('/:id', (req, res) => {
    try {
        const templates = loadTemplates();
        if (templates[req.params.id]) {
            delete templates[req.params.id];
            if (saveTemplates(templates)) {
                res.json({ success: true });
            } else {
                res.status(500).json({ success: false, error: 'Failed to delete template' });
            }
        } else {
            res.status(404).json({ success: false, error: 'Template not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
