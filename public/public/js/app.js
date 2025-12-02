class WhatsAppGHLApp {
    constructor() {
        this.socket = io();
        this.currentConversation = null;
        this.conversations = [];
        this.currentTab = 'whatsapp';
        
        this.initializeEventListeners();
        this.loadConversations();
        this.checkStatus();
    }

    initializeEventListeners() {
        // Socket events
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('qr_code', (qr) => {
            this.showQRCode(qr);
        });

        this.socket.on('whatsapp_ready', (data) => {
            this.updateWhatsAppStatus('online', 'Connected');
            this.hideQRCode();
        });

        this.socket.on('new_message', (message) => {
            this.handleNewMessage(message);
        });

        this.socket.on('ai_reply', (reply) => {
            this.handleAIReply(reply);
        });

        // UI events
        document.getElementById('send-button').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        document.getElementById('ai-toggle').addEventListener('change', (e) => {
            this.toggleAI(e.target.checked);
        });

        document.getElementById('ghl-sync-toggle').addEventListener('change', (e) => {
            this.toggleGHLSync(e.target.checked);
        });

        // Tab switching events
        document.querySelectorAll('[data-bs-toggle="pill"]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = e.target.id.replace('-tab', '');
                this.switchTab(tabId);
            });
        });
    }

    async loadConversations() {
        try {
            const response = await fetch('/api/conversations');
            this.conversations = await response.json();
            this.renderConversations();
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    async switchTab(tabType) {
        this.currentTab = tabType;
        
        try {
            let conversations = [];
            
            if (tabType === 'all') {
                conversations = this.conversations;
            } else {
                const response = await fetch(`/api/conversations/type/${tabType}`);
                conversations = await response.json();
            }
            
            this.renderConversationsByType(tabType, conversations);
        } catch (error) {
            console.error('Error loading conversations for tab:', error);
        }
    }

    renderConversations() {
        // Render all conversations in the default view
        this.renderConversationsByType('whatsapp', this.conversations.filter(c => c.type === 'whatsapp'));
    }

    renderConversationsByType(type, conversations) {
        const containerId = `${type}-conversations-list`;
        const container = document.getElementById(containerId);
        
        if (!container) return;
        
        container.innerHTML = '';

        if (conversations.length === 0) {
            container.innerHTML = `<div class="text-muted text-center p-3">No ${type} conversations yet</div>`;
            return;
        }

        conversations.forEach(conversation => {
            const item = document.createElement('div');
            item.className = 'conversation-item';
            
            // Get channel icon
            const channelIcon = this.getChannelIcon(conversation.type, conversation.channel);
            
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="d-flex align-items-center">
                            ${channelIcon}
                            <strong>${conversation.name || 'Unknown Contact'}</strong>
                        </div>
                        <small class="text-muted">${conversation.phone}</small>
                        <br>
                        <small class="badge bg-secondary">${conversation.type.toUpperCase()}</small>
                    </div>
                    <div class="text-end">
                        <small class="text-muted">${this.formatTime(conversation.updatedAt)}</small>
                        <br>
                        <div class="d-flex gap-1 mt-1">
                            ${conversation.aiEnabled ? '<i class="fas fa-robot text-success" title="AI Enabled"></i>' : ''}
                            ${conversation.syncToGHL ? '<i class="fas fa-sync text-primary" title="GHL Sync"></i>' : ''}
                        </div>
                    </div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.selectConversation(conversation);
            });
            
            container.appendChild(item);
        });
    }

    getChannelIcon(type, channel) {
        const icons = {
            'whatsapp': '<i class="fab fa-whatsapp text-success me-2"></i>',
            'whatsapp_private': '<i class="fab fa-whatsapp text-success me-2"></i>',
            'whatsapp_group': '<i class="fas fa-users text-success me-2"></i>',
            'sms': '<i class="fas fa-sms text-primary me-2"></i>',
            'email': '<i class="fas fa-envelope text-info me-2"></i>'
        };
        
        return icons[channel] || icons[type] || '<i class="fas fa-comment me-2"></i>';
    }

    selectConversation(conversation) {
        this.currentConversation = conversation;
        
        // Update UI
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
        
        // Show chat screen
        document.getElementById('welcome-screen').style.display = 'none';
        document.getElementById('chat-screen').style.display = 'block';
        
        // Update chat header
        document.getElementById('chat-title').textContent = conversation.name || 'Unknown Contact';
        document.getElementById('chat-subtitle').textContent = conversation.phone;
        
        // Update toggles
        document.getElementById('ai-toggle').checked = conversation.aiEnabled;
        document.getElementById('ghl-sync-toggle').checked = conversation.syncToGHL;
        
        // Load messages
        this.loadMessages(conversation.id);
    }

    async loadMessages(conversationId) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}`);
            const conversation = await response.json();
            
            const container = document.getElementById('messages-container');
            container.innerHTML = '';
            
            conversation.messages.forEach(message => {
                this.addMessageToUI(message);
            });
            
            this.scrollToBottom();
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    addMessageToUI(message) {
        const container = document.getElementById('messages-container');
        const messageDiv = document.createElement('div');
        
        let messageClass = 'message other';
        if (message.from === 'ai') {
            messageClass = 'message ai';
        } else if (message.from !== 'user') {
            messageClass = 'message user';
        }
        
        messageDiv.className = messageClass;
        messageDiv.innerHTML = `
            <div class="message-content">${this.escapeHtml(message.body)}</div>
            <div class="message-time">${this.formatTime(message.timestamp)}</div>
        `;
        
        container.appendChild(messageDiv);
    }

    handleNewMessage(message) {
        if (this.currentConversation && message.from === this.currentConversation.id) {
            this.addMessageToUI(message);
            this.scrollToBottom();
        }
        
        // Reload conversations to update the list
        this.loadConversations();
    }

    handleAIReply(reply) {
        if (this.currentConversation && reply.to === this.currentConversation.id) {
            const aiMessage = {
                from: 'ai',
                body: reply.body,
                timestamp: reply.timestamp
            };
            this.addMessageToUI(aiMessage);
            this.scrollToBottom();
        }
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message || !this.currentConversation) return;
        
        try {
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: this.currentConversation.id,
                    message: message
                })
            });
            
            if (response.ok) {
                // Add message to UI immediately
                const userMessage = {
                    from: 'user',
                    body: message,
                    timestamp: Date.now()
                };
                this.addMessageToUI(userMessage);
                this.scrollToBottom();
                
                input.value = '';
            } else {
                throw new Error('Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    }

    async toggleAI(enabled) {
        if (!this.currentConversation) return;
        
        try {
            const response = await fetch(`/api/conversations/${this.currentConversation.id}/ai-toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled })
            });
            
            if (response.ok) {
                this.currentConversation.aiEnabled = enabled;
            } else {
                throw new Error('Failed to toggle AI');
            }
        } catch (error) {
            console.error('Error toggling AI:', error);
            // Revert toggle state
            document.getElementById('ai-toggle').checked = !enabled;
        }
    }

    async toggleGHLSync(enabled) {
        if (!this.currentConversation) return;
        
        try {
            const response = await fetch(`/api/conversations/${this.currentConversation.id}/ghl-sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled })
            });
            
            if (response.ok) {
                this.currentConversation.syncToGHL = enabled;
            } else {
                throw new Error('Failed to toggle GHL sync');
            }
        } catch (error) {
            console.error('Error toggling GHL sync:', error);
            // Revert toggle state
            document.getElementById('ghl-sync-toggle').checked = !enabled;
        }
    }

    showQRCode(qr) {
        const qrSection = document.getElementById('qr-section');
        const qrContainer = document.getElementById('qr-code');
        
        qrSection.style.display = 'block';
        QRCode.toCanvas(qrContainer, qr, { width: 200 }, (error) => {
            if (error) console.error('Error generating QR code:', error);
        });
    }

    hideQRCode() {
        document.getElementById('qr-section').style.display = 'none';
    }

    updateWhatsAppStatus(status, text) {
        const indicator = document.getElementById('whatsapp-status');
        const statusText = document.getElementById('whatsapp-status-text');
        
        indicator.className = `status-indicator status-${status}`;
        statusText.textContent = text;
    }

    async checkStatus() {
        // Check WhatsApp status
        this.updateWhatsAppStatus('connecting', 'Connecting...');
        
        // Check GHL status
        try {
            const response = await fetch('/api/ghl/contacts');
            document.getElementById('ghl-status').className = 'status-indicator status-online';
            document.getElementById('ghl-status-text').textContent = 'Connected';
        } catch (error) {
            document.getElementById('ghl-status').className = 'status-indicator status-offline';
            document.getElementById('ghl-status-text').textContent = 'Not Connected';
        }
        
        // Check AI status
        document.getElementById('ai-status').className = 'status-indicator status-online';
        document.getElementById('ai-status-text').textContent = 'Ready';
    }

    scrollToBottom() {
        const container = document.getElementById('messages-container');
        container.scrollTop = container.scrollHeight;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // Less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) { // Less than 1 hour
            return `${Math.floor(diff / 60000)}m ago`;
        } else if (diff < 86400000) { // Less than 1 day
            return `${Math.floor(diff / 3600000)}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WhatsAppGHLApp();
});
