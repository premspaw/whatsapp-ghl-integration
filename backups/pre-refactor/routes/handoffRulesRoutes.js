const express = require('express');
const fs = require('fs');
const path = require('path');

module.exports = (enhancedAIService) => {
  const router = express.Router();
  const rulesPath = path.join(__dirname, '..', 'data', 'handoff_rules.json');

  // Get current handoff rules
  router.get('/', (req, res) => {
    try {
      const raw = fs.readFileSync(rulesPath, 'utf8');
      const rules = JSON.parse(raw);
      res.json({ success: true, rules });
    } catch (e) {
      res.status(404).json({ success: false, error: 'handoff_rules.json not found' });
    }
  });

  // Update handoff rules
  router.put('/', express.json(), async (req, res) => {
    try {
      const incoming = req.body;
      if (!incoming || typeof incoming !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid rules payload' });
      }
      // Minimal validation
      incoming.keywords = Array.isArray(incoming.keywords) ? incoming.keywords : [];
      incoming.auto_handoff_topics = Array.isArray(incoming.auto_handoff_topics) ? incoming.auto_handoff_topics : [];

      fs.writeFileSync(rulesPath, JSON.stringify(incoming, null, 2));
      if (enhancedAIService && typeof enhancedAIService.reloadHandoffRules === 'function') {
        await enhancedAIService.reloadHandoffRules();
      }
      res.json({ success: true, message: 'Rules updated', rules: incoming });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
};