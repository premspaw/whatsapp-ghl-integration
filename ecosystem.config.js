module.exports = {
    apps: [
        // Existing WhatsApp-GHL Backend - DON'T MODIFY
        {
            name: 'whatsapp-backend',
            script: 'src/server.js',
            cwd: '/root/whatsapp-ghl-integration',
            env: {
                PORT: 3000,
                NODE_ENV: 'production'
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G'
        },

        // NEW - Loyalty Frontend
        {
            name: 'loyalty-frontend',
            script: 'npm',
            args: 'start',
            cwd: '/root/whatsapp-ghl-integration/loyalty-app',
            env: {
                PORT: 3001,
                NODE_ENV: 'production'
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M'
        }
    ]
};
