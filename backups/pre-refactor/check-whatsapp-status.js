require('dotenv').config();
const WhatsAppService = require('./services/whatsappService');

console.log('🔍 Checking WhatsApp connection status...');

const whatsappService = new WhatsAppService();

whatsappService.on('qr', (qr) => {
  console.log('\n📱 QR Code for WhatsApp authentication:');
  console.log('Please scan this QR code with your WhatsApp mobile app');
  console.log('Go to WhatsApp > Settings > Linked Devices > Link a Device');
  console.log('\n' + '='.repeat(50));
  // QR code will be displayed by qrcode-terminal
});

whatsappService.on('ready', () => {
  console.log('\n✅ WhatsApp client is ready and connected!');
  console.log('🎉 You can now send and receive messages');
  process.exit(0);
});

whatsappService.on('disconnected', (reason) => {
  console.log('\n❌ WhatsApp client disconnected:', reason);
  console.log('💡 You may need to scan the QR code again');
  process.exit(1);
});

whatsappService.on('auth_failure', (msg) => {
  console.log('\n🚫 Authentication failed:', msg);
  console.log('💡 Please try scanning the QR code again');
  process.exit(1);
});

console.log('🔄 Initializing WhatsApp client...');
console.log('⏳ This may take a few moments...');

whatsappService.initialize();

// Timeout after 2 minutes
setTimeout(() => {
  console.log('\n⏰ Timeout: WhatsApp initialization took too long');
  console.log('💡 Please try running this script again');
  process.exit(1);
}, 120000);