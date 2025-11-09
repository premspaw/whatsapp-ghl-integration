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

  // Force reconnection (generates new QR code)
  router.post('/reconnect', async (req, res) => {
    try {
      if (whatsappService && typeof whatsappService.disconnect === 'function') {
        await whatsappService.disconnect();
        // Wait a moment then reinitialize
        setTimeout(() => {
          if (whatsappService && typeof whatsappService.initialize === 'function') {
            whatsappService.initialize();
          }
        }, 2000);
        
        res.json({
          success: true,
          message: 'Reconnection initiated. New QR code will be generated shortly.'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'WhatsApp service not available'
        });
      }
    } catch (error) {
      console.error('Error during reconnection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reconnect',
        details: error.message
      });
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

          if (normalized && ghlService && ghlService.findContactByPhone) {
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

  // Send a WhatsApp message
  router.post('/send', async (req, res) => {
    try {
      const { to, message, body } = req.body || {};
      const text = typeof message === 'string' ? message : body;
      if (!to || !text) {
        return res.status(400).json({ success: false, error: 'Missing required fields: to, message' });
      }

      if (!whatsappService || typeof whatsappService.sendMessage !== 'function') {
        return res.status(500).json({ success: false, error: 'WhatsApp service not available' });
      }

      // Normalize phone number to WhatsApp chat ID
      let chatId = to;
      if (!String(chatId).includes('@c.us')) {
        chatId = String(chatId).replace(/[^\d+]/g, '');
        if (chatId.startsWith('+')) chatId = chatId.substring(1);
        chatId = chatId + '@c.us';
      }

      const result = await whatsappService.sendMessage(chatId, text);

      // Optionally record into conversation manager
      try {
        if (conversationManager && typeof conversationManager.addMessage === 'function') {
          await conversationManager.addMessage(to, {
            id: result?.id?._serialized || `sent_${Date.now()}`,
            from: 'me',
            body: text,
            timestamp: Date.now(),
            type: 'text'
          });
        }
      } catch (_) { /* non-fatal */ }

      res.json({ success: true, result: {
        id: result?.id?._serialized,
        to: to,
        chatId,
        body: text
      }});
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};