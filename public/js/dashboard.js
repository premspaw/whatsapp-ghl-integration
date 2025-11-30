// Dashboard Logic
const API_BASE = window.location.origin;
const apiUrl = (path) => `${API_BASE}${path}`;

// State
let conversations = [];
let selectedConversation = null;
let filteredConversations = [];
let socket = null;
let isConnected = false;

// DOM Elements
const els = {
    conversationList: document.getElementById('conversationList'),
    messagesArea: document.getElementById('messagesArea'),
    messageInput: document.getElementById('messageInput'),
    sendButton: document.getElementById('sendButton'),
    searchBox: document.getElementById('searchBox'),
    chatHeader: document.getElementById('chatHeader'),
    emptyState: document.getElementById('emptyState'),
    messageInputArea: document.getElementById('messageInputArea'),
    chatAvatar: document.getElementById('chatAvatar'),
    chatContactName: document.getElementById('chatContactName'),
    chatContactPhone: document.getElementById('chatContactPhone'),
    typingIndicator: document.getElementById('typingIndicator'),
    connectionStatus: document.getElementById('connectionStatus'),
    stats: {
        total: document.getElementById('totalConversations'),
        active: document.getElementById('activeToday'),
        ai: document.getElementById('aiResponses')
    }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadConversations();
    initializeSocket();
    setupEventListeners();
    checkWhatsAppStatus();

    // Periodic checks
    setInterval(checkWhatsAppStatus, 10000);
    setInterval(loadConversations, 30000);
});

function setupEventListeners() {
    els.searchBox.addEventListener('input', searchConversations);

    els.sendButton.addEventListener('click', sendMessage);

    els.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterConversations(btn.dataset.filter);
        });
    });

    // Header Actions
    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadConversations();
        checkWhatsAppStatus();
    });

    // Templates Button - Navigate to templates page
    document.getElementById('templatesBtn').addEventListener('click', () => {
        window.location.href = '/templates.html';
    });

    // Emoji Picker
    const emojiBtn = document.getElementById('emojiBtn');
    const emojiPicker = document.getElementById('emojiPicker');

    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = emojiPicker.style.display === 'block';
        emojiPicker.style.display = isVisible ? 'none' : 'block';
        document.getElementById('templatePicker').style.display = 'none';
    });

    emojiPicker.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent closing when clicking inside picker
        if (e.target.classList.contains('emoji-grid') || e.target.parentElement.classList.contains('emoji-grid')) {
            // Clicked on grid background, do nothing
            return;
        }

        // Check if clicked on an emoji (text node or element)
        const emoji = e.target.textContent.trim();
        // Simple regex to check if it's likely an emoji (non-ascii)
        if (emoji && /[^\u0000-\u007F]+/.test(emoji)) {
            els.messageInput.value += emoji;
            els.messageInput.focus();
        }
    });

    // Template Send Button
    const templateSendBtn = document.getElementById('templateSendBtn');
    const templatePicker = document.getElementById('templatePicker');

    templateSendBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        emojiPicker.style.display = 'none';
        templatePicker.style.display = templatePicker.style.display === 'none' ? 'block' : 'none';

        if (templatePicker.style.display === 'block') {
            await loadTemplates();
        }
    });

    // File Attachment
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');

    attachBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await sendFile(file);
            fileInput.value = '';
        }
    });

    // Close pickers when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.input-actions') && !e.target.closest('.emoji-picker') && !e.target.closest('.template-picker')) {
            emojiPicker.style.display = 'none';
            templatePicker.style.display = 'none';
        }
    });
}

// --- Data Loading ---
async function loadConversations() {
    try {
        const response = await fetch(apiUrl('/api/whatsapp/conversations'));
        const data = await response.json();

        if (data.success) {
            conversations = data.conversations || [];
            // Re-apply current filter
            const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
            filterConversations(activeFilter);
            updateStats();
        }
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

// --- UI Rendering ---
function renderConversations() {
    if (filteredConversations.length === 0) {
        els.conversationList.innerHTML = `
            <div class="empty-state" style="background:transparent; border:none;">
                <p>No conversations found</p>
            </div>
        `;
        return;
    }

    els.conversationList.innerHTML = filteredConversations.map(conv => {
        const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
        const contactName = conv.contactName || conv.name || conv.phoneNumber || 'Unknown';
        const isActive = selectedConversation && selectedConversation.id === conv.id;
        const initials = getInitials(contactName);
        const time = lastMsg ? formatTime(lastMsg.timestamp) : '';
        const preview = lastMsg ? (lastMsg.body || (lastMsg.hasMedia ? '📷 Media' : '')) : 'No messages';

        return `
            <div class="conversation-item ${isActive ? 'active' : ''}" onclick="selectConversation('${conv.id}')">
                <div class="contact-avatar">${initials}</div>
                <div class="conversation-details">
                    <div class="contact-name">${contactName}</div>
                    <div class="last-message">${preview}</div>
                </div>
                <div class="conversation-meta">
                    <span class="timestamp">${time}</span>
                    ${conv.unreadCount > 0 ? `<span class="unread-badge">${conv.unreadCount}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function selectConversation(id) {
    selectedConversation = conversations.find(c => c.id === id);
    if (!selectedConversation) return;

    // Update UI
    renderConversations(); // To highlight active item

    // Show Chat UI
    els.emptyState.style.display = 'none';
    els.chatHeader.style.display = 'flex';
    els.messageInputArea.style.display = 'flex';

    // Update Header
    const name = selectedConversation.contactName || selectedConversation.name || 'Unknown';
    els.chatContactName.textContent = name;
    els.chatContactPhone.textContent = selectedConversation.phoneNumber || '';
    els.chatAvatar.textContent = getInitials(name);

    renderMessages();
    scrollToBottom();

    // Mark as read (optional API call)
    // fetch(apiUrl(`/api/conversations/${id}/mark-read`), { method: 'POST' });
}

function renderMessages() {
    if (!selectedConversation) return;

    const msgs = selectedConversation.messages || [];
    els.messagesArea.innerHTML = msgs.map(msg => {
        const isOutgoing = msg.from === 'ai' || msg.from === 'bot' || msg.direction === 'outbound';
        const time = formatTime(msg.timestamp);
        const status = isOutgoing ? '✓✓' : ''; // Simplified status

        // Handle media messages
        let mediaHtml = '';
        if (msg.hasMedia && msg.mediaUrl) {
            // Check if it's an image (either by extension or data URL)
            const isImage = msg.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || msg.mediaUrl.startsWith('data:image/');
            if (isImage) {
                mediaHtml = `<img src="${msg.mediaUrl}" style="max-width: 300px; border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer;" alt="Image" onclick="window.open('${msg.mediaUrl}', '_blank')">`;
            } else {
                mediaHtml = `<a href="${msg.mediaUrl}" target="_blank" style="color: #2563eb;">📎 ${msg.body || msg.fileName || 'Attachment'}</a>`;
            }
        }

        return `
            <div class="message ${isOutgoing ? 'outgoing' : 'incoming'}">
                <div class="message-content">
                    ${mediaHtml}
                    ${msg.body && !mediaHtml ? `<div class="message-text">${msg.body || ''}</div>` : ''}
                    ${msg.body && mediaHtml ? `<div class="message-text" style="margin-top: 0.5rem;">${msg.body}</div>` : ''}
                    <div class="message-meta">
                        <span class="message-time">${time}</span>
                        <span class="message-status">${status}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- Actions ---
async function sendMessage() {
    const text = els.messageInput.value.trim();
    if (!text || !selectedConversation) return;

    // Optimistic UI update
    const tempId = 'temp_' + Date.now();
    const newMsg = {
        id: tempId,
        from: 'ai',
        body: text,
        timestamp: Date.now(),
        direction: 'outbound'
    };

    selectedConversation.messages.push(newMsg);
    renderMessages();
    scrollToBottom();
    els.messageInput.value = '';

    try {
        const response = await fetch(apiUrl('/api/whatsapp/send'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: selectedConversation.phoneNumber || selectedConversation.id,
                message: text
            })
        });

        const data = await response.json();
        if (!data.success) {
            console.error('Send failed:', data.error);
            alert('Failed to send message');
        }
    } catch (err) {
        console.error('Send error:', err);
    }
}

// --- Helpers ---
function filterConversations(filter) {
    if (filter === 'all') {
        filteredConversations = conversations;
    } else if (filter === 'unread') {
        filteredConversations = conversations.filter(c => c.unreadCount > 0);
    } else if (filter === 'read') {
        filteredConversations = conversations.filter(c => !c.unreadCount);
    }
    renderConversations();
}

function searchConversations() {
    const term = els.searchBox.value.toLowerCase();
    filteredConversations = conversations.filter(c => {
        const name = (c.contactName || c.name || '').toLowerCase();
        const phone = (c.phoneNumber || '').toLowerCase();
        return name.includes(term) || phone.includes(term);
    });
    renderConversations();
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function formatTime(ts) {
    const date = new Date(ts > 1e10 ? ts : ts * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
    els.messagesArea.scrollTop = els.messagesArea.scrollHeight;
}

function updateStats() {
    els.stats.total.textContent = conversations.length;
    // Simple logic for active today
    const today = new Date().toDateString();
    const active = conversations.filter(c => new Date(c.updatedAt).toDateString() === today).length;
    els.stats.active.textContent = active;
}

// --- Socket.IO ---
function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        isConnected = true;
        updateConnectionStatus('connected');
        socket.emit('join_room', 'whatsapp');
    });

    socket.on('disconnect', () => {
        isConnected = false;
        updateConnectionStatus('disconnected');
    });

    socket.on('new_message', (msg) => {
        handleIncomingMessage(msg);
    });

    socket.on('ai_reply', (msg) => {
        handleIncomingMessage({ ...msg, from: 'ai' });
    });
}

function handleIncomingMessage(msg) {
    // Find conversation
    let conv = conversations.find(c => c.id === msg.conversationId || c.id === msg.from || c.id === msg.to);

    if (!conv) {
        // New conversation logic would go here, for now just reload
        loadConversations();
        return;
    }

    conv.messages.push({
        id: msg.id,
        from: msg.from === 'ai' ? 'ai' : 'user',
        body: msg.body,
        timestamp: msg.timestamp || Date.now()
    });

    conv.updatedAt = Date.now();
    if (msg.from !== 'ai') conv.unreadCount = (conv.unreadCount || 0) + 1;

    // Update UI
    renderConversations();
    if (selectedConversation && selectedConversation.id === conv.id) {
        renderMessages();
        scrollToBottom();
    }
}

function checkWhatsAppStatus() {
    fetch(apiUrl('/api/whatsapp/status'))
        .then(r => r.json())
        .then(data => {
            if (data.status === 'connected') updateConnectionStatus('connected');
            else updateConnectionStatus('disconnected');
        })
        .catch(() => updateConnectionStatus('disconnected'));
}

function updateConnectionStatus(status) {
    const el = els.connectionStatus;
    if (status === 'connected') {
        el.textContent = 'Connected';
        el.className = 'connection-status connected';
    } else {
        el.textContent = 'Disconnected';
        el.className = 'connection-status disconnected';
    }
}

// --- Template Functions ---
async function loadTemplates() {
    try {
        const response = await fetch(apiUrl('/api/templates'));
        const data = await response.json();

        if (data.success && data.templates) {
            renderTemplates(data.templates);
        }
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

function renderTemplates(templates) {
    const templateList = document.getElementById('templateList');

    if (!templates || templates.length === 0) {
        templateList.innerHTML = '<div style="padding: 1rem; text-align: center; color: #94a3b8;">No templates found</div>';
        return;
    }

    templateList.innerHTML = templates.map(template => `
        < div class="template-item" onclick = "sendTemplate('${template.id}')" >
            <div class="template-name">${template.name}</div>
            <div class="template-preview">${template.content.substring(0, 50)}...</div>
        </div >
        `).join('');
}

async function sendTemplate(templateId) {
    if (!selectedConversation) return;

    try {
        const response = await fetch(apiUrl('/api/whatsapp/send-template'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: selectedConversation.phoneNumber || selectedConversation.id,
                templateId: templateId,
                variables: {}
            })
        });

        const data = await response.json();
        if (data.success) {
            document.getElementById('templatePicker').style.display = 'none';
            loadConversations();
        } else {
            alert('Failed to send template: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error sending template:', error);
        alert('Failed to send template');
    }
}

// --- File Upload Functions ---
async function sendFile(file) {
    if (!selectedConversation) return;

    try {
        // Upload file first
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch(apiUrl('/api/media/upload'), {
            method: 'POST',
            body: formData
        });

        const uploadData = await uploadResponse.json();

        if (!uploadData.success) {
            alert('Failed to upload file: ' + (uploadData.error || 'Unknown error'));
            return;
        }

        // Send message with media
        const response = await fetch(apiUrl('/api/whatsapp/send'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: selectedConversation.phoneNumber || selectedConversation.id,
                message: file.name, // Caption
                mediaUrl: uploadData.url,
                mediaType: uploadData.mediaType
            })
        });

        const data = await response.json();
        if (data.success) {
            // Add to UI
            selectedConversation.messages.push({
                id: 'temp_' + Date.now(),
                from: 'ai',
                body: file.name,
                timestamp: Date.now(),
                hasMedia: true,
                mediaUrl: uploadData.url,
                direction: 'outbound'
            });
            renderMessages();
            scrollToBottom();
        } else {
            alert('Failed to send file');
        }
    } catch (error) {
        console.error('Error sending file:', error);
        alert('Failed to send file');
    }
}
