# GHL Loyalty Integration Guide

## 🚀 Overview
The Lumina Derma loyalty app is now **fully integrated** with GoHighLevel! No registration forms needed - everything works through GHL contacts and workflows.

---

## 📱 How Customers Access Their Loyalty Dashboard

### Method 1: Send Personalized Link from GHL

In your GHL **Conversations** or **Workflows**, send this custom value:

```
{{custom_values.loyalty_link}}
```

**Example Message:**
```
🎁 Hi {{contact.first_name}}!

Check your Lumina Derma rewards:
{{custom_values.loyalty_link}}

You're {{custom_values.visits_remaining}} visits away from your next reward! 
```

The link format:
```
https://yourapp.com/rewards/lumina-derma?contact={{contact.id}}&name={{contact.full_name}}&phone={{contact.phone}}
```

---

## 🎯 How to Add Stamps

### Option 1: QR Code Scan (Automatic)

1. **Create a Trigger Link in GHL**:
   - Name: "Loyalty Check-In"
   - Webhook URL: `https://yourbackend.com/api/v1/loyalty/visit`
   - Method: POST
   - Payload:
     ```json
     {
       "locationId": "lumina-derma",
       "contactId": "{{contact.id}}"
     }
     ```

2. **Generate QR Code**:
   - GHL automatically creates a QR code for the trigger link
   - Print it and place at your **front desk**

3. **Customer Flow**:
   - Customer scans QR → Triggers workflow → Adds stamp → Updates their dashboard!

---

### Option 2: Manual Stamp from GHL Custom Action

1. **Create Custom Action in GHL**:
   - Go to Settings → Custom Actions
   - Name: "Add Loyalty Stamp"
   - Webhook URL: `https://yourbackend.com/api/v1/ghl/add-stamp`
   - Method: POST
   - Payload:
     ```json
     {
       "locationId": "lumina-derma",
       "contactId": "{{contact.id}}"
     }
     ```

2. **How Staff Uses It**:
   - Open contact in GHL
   - Click "Add Loyalty Stamp" button
   - ✅ Stamp added instantly!

---

### Option 3: From GHL Workflow (Automated)

**Trigger:** Appointment Completed
**Action:** Webhook

**Webhook Configuration:**
- URL: `https://yourbackend.com/api/v1/ghl/add-stamp`
- Method: POST
- Body:
  ```json
  {
    "locationId": "lumina-derma",
    "contactId": "{{contact.id}}",
    "source": "appointment_complete"
  }
  ```

---

## 💬 Send Loyalty Status in Messages

### Get Customer's Current Progress

**API Endpoint:**
```
GET https://yourbackend.com/api/v1/ghl/customer-status/{{contact.id}}?locationId=lumina-derma
```

**Response:**
```json
{
  "enrolled": true,
  "totalVisits": 4,
  "nextReward": {
    "name": "HydraFacial Glow",
    "requiredVisits": 6,
    "visitsRemaining": 2
  }
}
```

### Use in GHL Workflows

Add a **Custom Field** to contacts called `loyalty_visits` that syncs with the API.

**Workflow Example:**
1. **Trigger**: Customer checks in
2. **Action**: HTTP Request → Get customer status
3. **Action**: Update custom field `loyalty_visits`
4. **Action**: Send SMS if reward unlocked:
   ```
   🎉 Congrats! You've unlocked: {{reward.name}}
   Claim it here: {{custom_values.loyalty_link}}
   ```

---

## 🎨 What Customers See

When they click their personalized link:

1. **Auto-Login** - No password or registration needed
2. **Personalized Greeting** - "Hello, Sarah!"
3. **Live Progress** - See their stamps with beautiful animations
4. **Reward Roadmap** - Visual journey showing unlocked rewards
5. **Cinematic Scroll** - Each milestone animates as they scroll

---

## 🔗 API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/loyalty/visit` | POST | QR scan or automated stamp |
| `/api/v1/ghl/add-stamp` | POST | Manual stamp from GHL |
| `/api/v1/ghl/loyalty-link/:contactId` | GET | Generate personalized link |
| `/api/v1/ghl/customer-status/:contactId` | GET | Get loyalty progress |
| `/api/v1/loyalty/settings/:locationId` | GET | Get clinic settings |

---

## 🎯 Complete Customer Journey Example

1. **First Visit**:
   - Customer books appointment in GHL
   - Receives welcome SMS with loyalty link
   - Clicks link → Auto-enrolled in loyalty program
   - Sees their personalized dashboard

2. **Check-In**:
   - Customer arrives at clinic
   - Scans QR code at front desk
   - ✅ Stamp added automatically
   - Receives SMS: "1 stamp added! 2 more for your first reward!"

3. **3rd Visit**:
   - Customer scans QR
   - ✅ Unlocks "Expert Skin Analysis"
   - Receives celebration SMS with confetti emoji
   - Can claim reward from their dashboard

4. **Return Visits**:
   - Customer just bookmarks their loyalty link
   - Always shows current progress
   - No login needed - works seamlessly!

---

## 🛠️ Setup Checklist

- [ ] Backend running on VPS with endpoints live
- [ ] GHL Trigger Link created for QR scan
- [ ] QR code printed and placed at front desk
- [ ] Custom Action "Add Loyalty Stamp" created
- [ ] Workflow set up for automatic stamping
- [ ] Custom field `loyalty_visits` added to contacts
- [ ] SMS templates updated with `{{custom_values.loyalty_link}}`
- [ ] Test with a real GHL contact

---

## 🎉 You're All Set!

Your loyalty program is now **seamlessly integrated** with GHL. Every action happens within the GHL ecosystem - no external logins, no separate databases for customers to remember!

**Next Steps:**
1. Test the QR scan flow
2. Send a test loyalty link to yourself
3. Try the manual stamp button
4. Watch the magic happen! ✨
