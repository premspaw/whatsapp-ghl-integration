// WhatsApp Business Widget
(function() {
    'use strict';
    
    // Configuration
    const config = window.whatsappConfig || {
        phoneNumber: '+1234567890',
        businessName: 'Your Business',
        apiEndpoint: '/api/whatsapp/send',
        theme: 'light',
        position: 'bottom-right',
        showOnMobile: true,
        businessHours: {
            enabled: false,
            timezone: 'UTC',
            schedule: {
                monday: { start: '09:00', end: '17:00' },
                tuesday: { start: '09:00', end: '17:00' },
                wednesday: { start: '09:00', end: '17:00' },
                thursday: { start: '09:00', end: '17:00' },
                friday: { start: '09:00', end: '17:00' },
                saturday: { start: '10:00', end: '14:00' },
                sunday: { start: '10:00', end: '14:00' }
            }
        }
    };

    // Widget HTML
    const widgetHTML = `
        <div id="whatsapp-widget" class="whatsapp-widget ${config.theme}">
            <div id="whatsapp-widget-button" class="whatsapp-widget-button">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
            </div>
            <div id="whatsapp-widget-popup" class="whatsapp-widget-popup" style="display: none;">
                <div class="whatsapp-widget-header">
                    <div class="whatsapp-widget-avatar">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
                    </div>
                    <div class="whatsapp-widget-info">
                        <div class="whatsapp-widget-name">${config.businessName}</div>
                        <div class="whatsapp-widget-status">Online</div>
                    </div>
                    <div class="whatsapp-widget-close">×</div>
                </div>
                <div class="whatsapp-widget-messages" id="whatsapp-widget-messages">
                    <div class="whatsapp-widget-message whatsapp-widget-message-bot">
                        <div class="whatsapp-widget-message-content">
                            Hello! How can we help you today?
                        </div>
                        <div class="whatsapp-widget-message-time">Just now</div>
                    </div>
                </div>
                <div class="whatsapp-widget-input">
                    <input type="text" id="whatsapp-widget-input-field" placeholder="Type a message...">
                    <button id="whatsapp-widget-send">Send</button>
                </div>
            </div>
        </div>
    `;

    // Widget CSS
    const widgetCSS = `
        .whatsapp-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .whatsapp-widget-button {
            width: 60px;
            height: 60px;
            background: #25D366;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(37, 211, 102, 0.4);
            transition: all 0.3s ease;
            color: white;
        }
        
        .whatsapp-widget-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(37, 211, 102, 0.6);
        }
        
        .whatsapp-widget-popup {
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 350px;
            height: 500px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .whatsapp-widget-header {
            background: #075E54;
            color: white;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .whatsapp-widget-avatar {
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .whatsapp-widget-info {
            flex: 1;
        }
        
        .whatsapp-widget-name {
            font-weight: 600;
            font-size: 16px;
        }
        
        .whatsapp-widget-status {
            font-size: 12px;
            opacity: 0.8;
        }
        
        .whatsapp-widget-close {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
        }
        
        .whatsapp-widget-messages {
            flex: 1;
            padding: 16px;
            overflow-y: auto;
            background: #f0f0f0;
        }
        
        .whatsapp-widget-message {
            margin-bottom: 12px;
            display: flex;
            flex-direction: column;
        }
        
        .whatsapp-widget-message-bot .whatsapp-widget-message-content {
            background: white;
            padding: 8px 12px;
            border-radius: 18px 18px 18px 4px;
            max-width: 80%;
            align-self: flex-start;
        }
        
        .whatsapp-widget-message-user .whatsapp-widget-message-content {
            background: #DCF8C6;
            padding: 8px 12px;
            border-radius: 18px 18px 4px 18px;
            max-width: 80%;
            align-self: flex-end;
        }
        
        .whatsapp-widget-message-time {
            font-size: 11px;
            color: #666;
            margin-top: 4px;
            align-self: flex-start;
        }
        
        .whatsapp-widget-message-user .whatsapp-widget-message-time {
            align-self: flex-end;
        }
        
        .whatsapp-widget-input {
            padding: 16px;
            background: white;
            border-top: 1px solid #e0e0e0;
            display: flex;
            gap: 8px;
        }
        
        .whatsapp-widget-input input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 20px;
            outline: none;
            font-size: 14px;
        }
        
        .whatsapp-widget-input button {
            background: #25D366;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }
        
        .whatsapp-widget-input button:hover {
            background: #128C7E;
        }
        
        @media (max-width: 768px) {
            .whatsapp-widget-popup {
                width: 100vw;
                height: 100vh;
                bottom: 0;
                right: 0;
                border-radius: 0;
            }
        }
    `;

    // Initialize widget
    function initWidget() {
        // Add CSS
        const style = document.createElement('style');
        style.textContent = widgetCSS;
        document.head.appendChild(style);
        
        // Add HTML
        document.body.insertAdjacentHTML('beforeend', widgetHTML);
        
        // Add event listeners
        const button = document.getElementById('whatsapp-widget-button');
        const popup = document.getElementById('whatsapp-widget-popup');
        const close = document.querySelector('.whatsapp-widget-close');
        const sendButton = document.getElementById('whatsapp-widget-send');
        const inputField = document.getElementById('whatsapp-widget-input-field');
        
        button.addEventListener('click', () => {
            popup.style.display = popup.style.display === 'none' ? 'flex' : 'none';
        });
        
        close.addEventListener('click', () => {
            popup.style.display = 'none';
        });
        
        sendButton.addEventListener('click', sendMessage);
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        // Check business hours
        if (config.businessHours.enabled) {
            checkBusinessHours();
        }
    }
    
    function sendMessage() {
        const inputField = document.getElementById('whatsapp-widget-input-field');
        const message = inputField.value.trim();
        
        if (!message) return;
        
        // Add user message to chat
        addMessage(message, 'user');
        
        // Clear input
        inputField.value = '';
        
        // Send to API
        fetch(config.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                phoneNumber: config.phoneNumber,
                businessName: config.businessName
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Add bot response
                addMessage(data.response || 'Thank you for your message!', 'bot');
            } else {
                addMessage('Sorry, there was an error sending your message.', 'bot');
            }
        })
        .catch(error => {
            console.error('WhatsApp widget error:', error);
            addMessage('Sorry, there was an error sending your message.', 'bot');
        });
    }
    
    function addMessage(content, sender) {
        const messagesContainer = document.getElementById('whatsapp-widget-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `whatsapp-widget-message whatsapp-widget-message-${sender}`;
        
        const now = new Date();
        const time = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageDiv.innerHTML = `
            <div class="whatsapp-widget-message-content">${content}</div>
            <div class="whatsapp-widget-message-time">${time}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function checkBusinessHours() {
        const now = new Date();
        const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
        const time = now.toTimeString().slice(0, 5);
        
        const schedule = config.businessHours.schedule[day];
        if (!schedule || time < schedule.start || time > schedule.end) {
            // Outside business hours
            const button = document.getElementById('whatsapp-widget-button');
            button.style.opacity = '0.6';
            button.title = 'We are currently offline. Business hours: 9 AM - 5 PM';
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }
    
})();
