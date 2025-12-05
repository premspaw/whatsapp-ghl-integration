#!/usr/bin/env node

/**
 * GHL WhatsApp-syn Tab Integration Script
 * This script helps you add the WhatsApp-syn tab to your GHL dashboard
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
🚀 GHL WhatsApp-syn Tab Integration
=====================================

This script will help you add the "WhatsApp-syn" tab to your GHL dashboard.

📋 Prerequisites:
- GHL account with admin access
- Server running on localhost:3000
- WhatsApp connection established

`);

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  try {
    console.log('🔧 Integration Options:\n');
    console.log('1. Custom Field Method (Recommended)');
    console.log('2. Website Builder Method');
    console.log('3. App Marketplace Method (Advanced)');
    console.log('4. Manual Integration Guide\n');

    const choice = await askQuestion('Choose integration method (1-4): ');

    switch (choice) {
      case '1':
        await customFieldMethod();
        break;
      case '2':
        await websiteBuilderMethod();
        break;
      case '3':
        await appMarketplaceMethod();
        break;
      case '4':
        await manualIntegrationGuide();
        break;
      default:
        console.log('❌ Invalid choice. Please run the script again.');
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

async function customFieldMethod() {
  console.log(`
📝 Custom Field Method (Recommended)
====================================

This method adds the WhatsApp-syn tab as a custom field in GHL.

🔧 Steps:
1. Go to your GHL dashboard
2. Navigate to Settings → Custom Fields
3. Click "Add Custom Field"
4. Choose "URL" as field type
5. Set field name: "WhatsApp-syn"
6. Set URL: http://localhost:3000/ghl-whatsapp-tab.html
7. Save the field

✅ Benefits:
- Appears in contact records
- Easy to set up
- No coding required
- Works immediately

📱 Test it:
- Go to any contact record
- Look for the "WhatsApp-syn" field
- Click to open the tab

`);
}

async function websiteBuilderMethod() {
  console.log(`
🌐 Website Builder Method
=========================

This method creates a new page in GHL Website Builder.

🔧 Steps:
1. Go to Website Builder in GHL
2. Create a new page called "WhatsApp-syn"
3. Add this HTML code:

<iframe 
    src="http://localhost:3000/ghl-whatsapp-tab.html" 
    width="100%" 
    height="800px" 
    frameborder="0"
    style="border-radius: 8px;">
</iframe>

4. Save the page
5. Add to main navigation

✅ Benefits:
- Full page integration
- Customizable layout
- SEO friendly
- Mobile responsive

📱 Test it:
- Navigate to the new page
- Verify the tab loads correctly
- Test on mobile devices

`);
}

async function appMarketplaceMethod() {
  console.log(`
🏪 App Marketplace Method (Advanced)
=====================================

This method creates a proper GHL app for the marketplace.

🔧 Steps:
1. Register as GHL app developer
2. Create new app called "WhatsApp-syn"
3. Upload app configuration (ghl-app-config.json)
4. Set app URL: http://localhost:3000/ghl-whatsapp-tab.html
5. Configure permissions and webhooks
6. Submit for GHL review
7. Install in your GHL account

✅ Benefits:
- Official GHL app
- Marketplace distribution
- Professional integration
- Revenue potential

⚠️ Requirements:
- GHL developer account
- App review process
- Production server
- HTTPS required

📱 Test it:
- Install the app in GHL
- Verify tab appears in navigation
- Test all functionality

`);
}

async function manualIntegrationGuide() {
  console.log(`
📖 Manual Integration Guide
============================

For advanced users who want full control over the integration.

🔧 Steps:
1. Access GHL API directly
2. Create custom tab using GHL API
3. Configure webhooks for real-time sync
4. Set up authentication
5. Deploy to production server

📚 Resources:
- GHL API Documentation: https://highlevel.stoplight.io/
- GHL App Development: https://developers.gohighlevel.com/
- WhatsApp Business API: https://developers.facebook.com/docs/whatsapp/

⚠️ Requirements:
- Advanced technical knowledge
- GHL API access
- Production server
- SSL certificate

📱 Test it:
- Use GHL API to create tab
- Configure webhooks
- Test integration thoroughly

`);
}

// Run the script
main().catch(console.error);
