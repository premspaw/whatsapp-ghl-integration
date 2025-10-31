const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('🔄 Initializing WhatsApp client for QR code display...');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('\n📱 WhatsApp QR Code Generated!');
    console.log('📋 Scan this QR code with your WhatsApp mobile app:');
    console.log('   1. Open WhatsApp on your phone');
    console.log('   2. Go to Settings > Linked Devices');
    console.log('   3. Tap "Link a Device"');
    console.log('   4. Scan the QR code below:\n');
    
    // Display QR code in terminal
    qrcode.generate(qr, { small: true });
    
    console.log('\n⏳ Waiting for QR code scan...');
});

client.on('ready', () => {
    console.log('✅ WhatsApp client is ready and connected!');
    console.log('🎉 You can now close this script and use the main application.');
    process.exit(0);
});

client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
    console.log('🔄 Please restart this script to generate a new QR code.');
    process.exit(1);
});

client.on('disconnected', (reason) => {
    console.log('🔌 WhatsApp client disconnected:', reason);
    console.log('🔄 Please restart this script to reconnect.');
    process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping WhatsApp QR code display...');
    client.destroy();
    process.exit(0);
});

console.log('🚀 Starting WhatsApp client...');
client.initialize();