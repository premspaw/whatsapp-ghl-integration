// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        // Update active tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        // Load data for specific tabs
        if (tabName === 'logs') {
            loadServerLogs();
        } else if (tabName === 'messages') {
            loadMessages();
        } else if (tabName === 'prompt') {
            loadPrompt();
        }
    });
});

// Load status on page load
window.addEventListener('DOMContentLoaded', () => {
    refreshStatus();
    setInterval(refreshStatus, 5000); // Refresh every 5 seconds
});

// Refresh server status
async function refreshStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        document.getElementById('serverStatus').textContent = data.status === 'running' ? '🟢 Running' : '🔴 Error';
        document.getElementById('totalRequests').textContent = data.totalRequests || 0;
        document.getElementById('agentStatus').textContent = data.agentReady ? '🟢 Ready' : '🔴 Not Ready';
        document.getElementById('liveStatus').textContent = '🟢 Live';
        document.getElementById('liveStatus').title = `Last updated: ${new Date().toLocaleTimeString()}`;
    } catch (error) {
        document.getElementById('liveStatus').textContent = '🔴 Offline';
        document.getElementById('liveStatus').title = 'Server connection lost';
        console.error('Status refresh failed:', error);
    }
}

// Copy webhook URL
function copyWebhookUrl() {
    const url = document.getElementById('webhookUrl').textContent;
    navigator.clipboard.writeText(url).then(() => {
        alert('Webhook URL copied to clipboard!');
    });
}

// Quick actions
function viewLogs() {
    document.querySelector('[data-tab="logs"]').click();
}

function testWebhook() {
    document.querySelector('[data-tab="test"]').click();
}

// Configuration form
document.getElementById('configForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const config = {
        openrouterKey: document.getElementById('openrouterKey').value,
        pineconeKey: document.getElementById('pineconeKey').value,
        ghlKey: document.getElementById('ghlKey').value,
        synthcoreKey: document.getElementById('synthcoreKey').value
    };

    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        const result = await response.json();
        const alert = document.getElementById('configAlert');
        alert.textContent = result.message || 'Configuration saved successfully!';
        alert.className = 'alert success';
        alert.style.display = 'block';

        setTimeout(() => alert.style.display = 'none', 5000);
    } catch (error) {
        const alert = document.getElementById('configAlert');
        alert.textContent = `Error: ${error.message}`;
        alert.className = 'alert error';
        alert.style.display = 'block';
    }
});

// Test webhook form
document.getElementById('testForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const testData = {
        phone: document.getElementById('testPhone').value,
        fromName: document.getElementById('testName').value,
        text: document.getElementById('testMessage').value
    };

    try {
        const response = await fetch('/webhook/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });

        const result = await response.text();

        document.getElementById('responseSection').style.display = 'block';
        document.getElementById('responseText').textContent = `Status: ${response.status}\nResponse: ${result}\n\nNote: Check Activity Logs tab for AI response (takes ~30-40s)`;

        // Auto-refresh logs after 5 seconds
        setTimeout(() => {
            document.querySelector('[data-tab="logs"]').click();
        }, 5000);
    } catch (error) {
        document.getElementById('responseSection').style.display = 'block';
        document.getElementById('responseText').textContent = `Error: ${error.message}`;
    }
});

// Load server logs
async function loadServerLogs() {
    try {
        const response = await fetch('/api/logs');
        const data = await response.json();
        const container = document.getElementById('logsContainer');

        if (data.logs && data.logs.length > 0) {
            container.innerHTML = data.logs.map(line => {
                const timestampMatch = line.match(/\[(.*?)\]/);
                const timestamp = timestampMatch ? new Date(timestampMatch[1]).toLocaleTimeString() : 'N/A';
                const message = line.replace(/\[.*?\]\s*/, '');

                let type = 'info';
                if (message.includes('Error') || message.includes('Failed')) type = 'error';
                else if (message.includes('Success') || message.includes('initialized')) type = 'success';

                return `
                    <div class="log-entry">
                        <span class="log-time">${timestamp}</span>
                        <span class="log-type ${type}">${type.toUpperCase()}</span>
                        <span class="log-message">${message}</span>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<p class="hint">No logs available yet.</p>';
        }
    } catch (error) {
        console.error('Failed to load logs:', error);
    }
}

function clearLogDisplay() {
    document.getElementById('logsContainer').innerHTML = '<p class="hint">Logs cleared from display.</p>';
}

// Load recent messages
async function loadMessages() {
    const container = document.getElementById('messagesList');
    const filter = document.getElementById('messageFilter').value;

    try {
        const response = await fetch(`/api/messages?phone=${filter}&limit=50`);
        const data = await response.json();

        if (data.note) {
            container.innerHTML = `<p class="hint">Feature coming soon: ${data.note}</p>`;
        } else {
            // Implementation would go here
            container.innerHTML = '<p class="hint">Loading messages...</p>';
        }
    } catch (error) {
        container.innerHTML = `<p class="hint error">Error loading messages: ${error.message}</p>`;
    }
}

// Load current prompt
async function loadPrompt() {
    try {
        const response = await fetch('/api/prompt');
        const data = await response.json();
        document.getElementById('systemPrompt').value = data.prompt || 'Error loading prompt';
    } catch (error) {
        document.getElementById('systemPrompt').value = `Error: ${error.message}`;
    }
}

// Save prompt
async function savePrompt() {
    const prompt = document.getElementById('systemPrompt').value;
    const alert = document.getElementById('promptAlert');

    try {
        const response = await fetch('/api/prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });

        const result = await response.json();
        alert.textContent = result.message || 'Prompt saved! Restart server to apply.';
        alert.className = 'alert success';
        alert.style.display = 'block';

        setTimeout(() => alert.style.display = 'none', 5000);
    } catch (error) {
        alert.textContent = `Error: ${error.message}`;
        alert.className = 'alert error';
        alert.style.display = 'block';
    }
}

function resetPrompt() {
    if (confirm('Reset to default prompt? This will reload the current prompt.')) {
        loadPrompt();
    }
}

function previewPrompt() {
    const prompt = document.getElementById('systemPrompt').value;
    const preview = window.open('', 'Prompt Preview', 'width=700,height=600');
    preview.document.write(`
        <html>
            <head>
                <title>Prompt Preview</title>
                <style>
                    body { font-family: monospace; padding: 20px; white-space: pre-wrap; }
                </style>
            </head>
            <body>${prompt}</body>
        </html>
    `);
}
