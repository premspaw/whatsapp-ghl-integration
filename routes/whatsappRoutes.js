const express = require('express');
const QRCode = require('qrcode');

module.exports = (whatsappService, ghlService, enhancedAIService, conversationManager) => {
  const router = express.Router();

  // Store QR code data temporarily
  let currentQRCode = null;
  let connectionStatus = 'disconnected'; // disconnected, connecting, connected

  // Listen for QR code events from WhatsApp service
  if (whatsappService) {
    whatsappService.on('qr', (qr) => {
      currentQRCode = qr;
      connectionStatus = 'connecting';
      console.log('QR Code received for web display');
    });

    whatsappService.on('ready', () => {
      currentQRCode = null;
      connectionStatus = 'connected';
      console.log('WhatsApp connected - clearing QR code');
    });

    whatsappService.on('disconnected', () => {
      currentQRCode = null;
      connectionStatus = 'disconnected';
      console.log('WhatsApp disconnected');
    });
  }

  // Simple health check
  router.get('/health', (req, res) => {
    res.json({ success: true, service: 'whatsapp', timestamp: Date.now() });
  });

  // Get QR code for web display
  router.get('/qr-code', async (req, res) => {
    try {
      if (!currentQRCode) {
        return res.json({
          success: false,
          error: 'No QR code available',
          status: connectionStatus,
          message: connectionStatus === 'connected' ? 'WhatsApp is already connected' : 'QR code not generated yet'
        });
      }

      // Generate QR code as base64 image
      const qrCodeImage = await QRCode.toDataURL(currentQRCode, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      res.json({
        success: true,
        qrCode: qrCodeImage,
        status: connectionStatus,
        message: 'Scan this QR code with your WhatsApp mobile app'
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate QR code',
        details: error.message
      });
    }
  });

  // Get connection status
  router.get('/status', (req, res) => {
    const isReady = whatsappService ? whatsappService.isReady : false;
    const actualStatus = isReady ? 'connected' : (currentQRCode ? 'connecting' : 'disconnected');
    const sessionName = process.env.WHATSAPP_SESSION_NAME || 'Mywhatsapp';
    const clientInfo = whatsappService && whatsappService.client && whatsappService.client.info
      ? whatsappService.client.info
      : null;
    const accountNumber = clientInfo && clientInfo.wid && clientInfo.wid.user
      ? clientInfo.wid.user
      : null;
    const displayName = clientInfo && (clientInfo.pushname || clientInfo.me && clientInfo.me.name)
      ? (clientInfo.pushname || clientInfo.me.name)
      : null;

    res.json({
      success: true,
      status: actualStatus,
      isReady: isReady,
      hasQRCode: !!currentQRCode,
      sessionName,
      accountNumber,
      displayName,
      client: clientInfo ? {
        platform: clientInfo.platform,
        pushname: clientInfo.pushname,
        wid: clientInfo.wid
      } : null,
      message: isReady ? 'WhatsApp is connected and ready' :
        currentQRCode ? 'Waiting for QR code scan' :
          'WhatsApp is not connected'
    });
  });

  // Force reconnection (generates new QR code) - safe if client is null
  router.post('/reconnect', async (req, res) => {
    try {
      if (!whatsappService) {
        return res.status(500).json({ success: false, error: 'WhatsApp service not available' });
      }

      // Clear any cached QR and mark state
      currentQRCode = null;
      connectionStatus = 'connecting';

      // If a disconnect method exists and a client might be active, attempt it
      if (typeof whatsappService.disconnect === 'function') {
        try {
          await whatsappService.disconnect();
        } catch (e) {
          // If client is null or already closed, ignore and proceed
          console.warn('Disconnect skipped or failed, proceeding to initialize:', e && e.message);
        }
      }

      // Initialize regardless, so a fresh QR is generated
      if (typeof whatsappService.initialize === 'function') {
        setTimeout(() => {
          try {
            whatsappService.initialize();
          } catch (initErr) {
            console.error('Initialize failed during reconnect:', initErr);
          }
        }, 500);
      }

      return res.json({ success: true, message: 'Reconnection started. QR code will be available shortly.' });
    } catch (error) {
      console.error('Error during reconnection:', error);
      res.status(500).json({ success: false, error: 'Failed to reconnect', details: error.message });
    }
  });

  // Explicit connect route for frontends that call /connect
  router.post('/connect', async (req, res) => {
    try {
      if (!whatsappService) {
        return res.status(500).json({ success: false, error: 'WhatsApp service not available' });
      }

      // If already ready, just return success
      if (whatsappService.isReady) {
        return res.json({ success: true, message: 'WhatsApp already connected' });
      }

      // Clear any previous QR and mark as connecting
      currentQRCode = null;
      connectionStatus = 'connecting';

      // Initialize if possible
      if (typeof whatsappService.initialize === 'function') {
        whatsappService.initialize();
        return res.json({ success: true, message: 'Initializing WhatsApp; QR code will be available shortly' });
      }

      return res.status(500).json({ success: false, error: 'Initialize method not available on WhatsApp service' });
    } catch (error) {
      console.error('Error during connect:', error);
      res.status(500).json({ success: false, error: 'Failed to start WhatsApp', details: error.message });
    }
  });

  // GET alias for connect (some frontends use GET)
  router.get('/connect', async (req, res) => {
    try {
      if (!whatsappService) {
        return res.status(500).json({ success: false, error: 'WhatsApp service not available' });
      }

      if (whatsappService.isReady) {
        return res.json({ success: true, message: 'WhatsApp already connected' });
      }

      currentQRCode = null;
      connectionStatus = 'connecting';

      if (typeof whatsappService.initialize === 'function') {
        whatsappService.initialize();
        return res.json({ success: true, message: 'Initializing WhatsApp; QR code will be available shortly' });
      }

      return res.status(500).json({ success: false, error: 'Initialize method not available on WhatsApp service' });
    } catch (error) {
      console.error('Error during connect (GET):', error);
      res.status(500).json({ success: false, error: 'Failed to start WhatsApp', details: error.message });
    }
  });

  // Graceful disconnect route used by the frontend
  router.post('/disconnect', async (req, res) => {
    try {
      if (whatsappService && typeof whatsappService.disconnect === 'function') {
        await whatsappService.disconnect();
        // Clear any cached QR and update status
        currentQRCode = null;
        connectionStatus = 'disconnected';
        return res.json({ success: true, message: 'WhatsApp disconnected' });
      }
      return res.status(500).json({ success: false, error: 'WhatsApp service not available' });
    } catch (error) {
      console.error('Error during disconnect:', error);
      res.status(500).json({ success: false, error: 'Failed to disconnect', details: error.message });
    }
  });

  // WhatsApp conversations endpoint for custom tab
  router.get('/conversations', async (req, res) => {
    try {
      const conversations = await conversationManager.getAllConversations();

      // Format conversations and enrich with GHL contact name if available
      const formatted = await Promise.all((conversations || []).map(async (conv) => {
        let contactName = conv.contactName || conv.name || 'Unknown Contact';

        try {
          const phoneRaw = conv.phoneNumber || conv.phone;
          const normalized = ghlService && ghlService.normalizePhoneNumber
            ? ghlService.normalizePhoneNumber(phoneRaw)
            : null;

          // Only attempt GHL enrichment when GHL is configured
          const ghlEnabled = !!(ghlService && typeof ghlService.isConfigured === 'function' && ghlService.isConfigured());
          if (normalized && ghlEnabled && ghlService && ghlService.findContactByPhone) {
            const ghlContact = await ghlService.findContactByPhone(normalized);
            if (ghlContact) {
              contactName = ghlContact.firstName || ghlContact.name || contactName;
            }
          }
        } catch (_) {
          // Non-fatal enrichment failure; keep fallback name
        }

        return {
          id: conv.id || (conv.phoneNumber || conv.phone),
          contactName,
          phoneNumber: conv.phoneNumber || conv.phone,
          messages: conv.messages || [],
          lastMessage: (conv.messages && conv.messages.length > 0)
            ? conv.messages[conv.messages.length - 1]
            : null,
          aiEnabled: !!conv.aiEnabled,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          isRead: conv.isRead !== undefined ? conv.isRead : true, // Default to read if not specified
          unreadCount: conv.unreadCount || 0 // Default to 0 if not specified
        };
      }));

      res.json({ success: true, conversations: formatted, total: formatted.length });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Send a WhatsApp message or media
  router.post('/send', async (req, res) => {
    try {
      const { to, message, body, mediaUrl, mediaType, caption } = req.body || {};
      const text = typeof message === 'string' ? message : body;
      if (!to) {
        return res.status(400).json({ success: false, error: 'Missing required fields: to' });
      }

      if (!whatsappService) {
        return res.status(500).json({ success: false, error: 'WhatsApp service not available' });
      }

      const { normalize } = require('../utils/phoneNormalizer');
      const normalized = normalize(String(to));
      if (!normalized) {
        return res.status(400).json({ success: false, error: 'Invalid phone number format' });
      }

      // If mediaUrl provided, send media from URL; otherwise send text
      let result;
      if (mediaUrl && typeof whatsappService.sendMediaFromUrl === 'function') {
        const mediaKind = (mediaType || 'image').toLowerCase();
        result = await whatsappService.sendMediaFromUrl(normalized, mediaUrl, caption || text || '', mediaKind);

        try {
          if (conversationManager && typeof conversationManager.addMessage === 'function') {
            await conversationManager.addMessage({
              id: result?.id?._serialized || `sent_${Date.now()}`,
              from: 'ai', // Mark as AI/Bot for consistency if triggered via API
              body: caption || text || '',
              timestamp: Date.now(),
              type: mediaKind,
              hasMedia: true,
              mediaUrl,
              mediaType: mediaKind
            }, normalized);
          }
        } catch (_) { }
      } else {
        if (!text) {
          return res.status(400).json({ success: false, error: 'Missing required fields: message' });
        }
        const chatId = normalized.replace('+', '') + '@c.us';
        result = await whatsappService.sendMessage(chatId, text);

        try {
          if (conversationManager && typeof conversationManager.addMessage === 'function') {
            await conversationManager.addMessage({
              id: result?.id?._serialized || `sent_${Date.now()}`,
              from: 'ai', // Mark as AI/Bot for consistency if triggered via API
              body: text,
              timestamp: Date.now(),
              type: 'text'
            }, normalized);
          }
        } catch (_) { }
      }

      res.json({
        success: true, result: {
          id: result?.id?._serialized,
          to: to,
          body: text || caption || '',
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
