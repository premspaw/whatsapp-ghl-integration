# Update GHL Custom Field Iframe URL

## Current Issue
Your GHL custom field is using:
```html
<iframe 
    src="http://localhost:3000/ghl-whatsapp-tab.html" 
    width="100%" 
    height="800px" 
    frameborder="0"
    style="border-radius: 8px;">
</iframe>
```

## Solution
Update the iframe URL to use your subdomain:

```html
<iframe 
    src="https://whatsapp.synthcore.in/ghl-whatsapp-tab.html" 
    width="100%" 
    height="800px" 
    frameborder="0"
    style="border-radius: 8px;">
</iframe>
```

## Steps to Update:

1. **Go to GHL Dashboard**
2. **Navigate to**: Settings → Custom Fields
3. **Find your "WhatsApp-syn" field**
4. **Edit the field**
5. **Replace the iframe URL** from `localhost:3000` to `whatsapp.synthcore.in`
6. **Save the changes**

## Alternative: Use HTTPS
If you have SSL certificate on your subdomain, use:
```html
<iframe 
    src="https://whatsapp.synthcore.in/ghl-whatsapp-tab.html" 
    width="100%" 
    height="800px" 
    frameborder="0"
    style="border-radius: 8px;">
</iframe>
```

## Test the URL
Before updating, test if your subdomain is accessible:
- Visit: `https://whatsapp.synthcore.in/ghl-whatsapp-tab.html`
- Make sure the page loads correctly
- Check if the WhatsApp conversations are displayed

## Troubleshooting
If the page doesn't load:
1. Check if your server is running on the subdomain
2. Verify DNS settings point to your server
3. Ensure port 3000 is accessible from the internet
4. Check firewall settings
