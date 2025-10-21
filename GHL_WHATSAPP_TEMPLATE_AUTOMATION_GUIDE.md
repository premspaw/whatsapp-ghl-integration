# 🎯 GHL WhatsApp Template Automation - Complete Guide

## ✅ NEW FEATURE: Send WhatsApp Templates from GHL!

You can now trigger **WhatsApp templates with variables** from GHL automation workflows!

---

## 📋 Your Current Templates

You already have a template created:

| Template Name | Template Content | Variables |
|---------------|------------------|-----------|
| **welcome** | `Hi {name} this new automation working checking` | `{name}` |
| **Template ID** | `tpl_1760729292502` | |

---

## 🎯 How to Trigger Templates from GHL

### Option 1: Using Template Name (RECOMMENDED)

**GHL Workflow Setup:**

1. **Trigger:** Contact Tag Added / Form Submitted / Any trigger
2. **Action:** Custom Webhook

**Webhook Configuration:**

```
Method: POST
URL: https://YOUR-NGROK-URL.ngrok-free.dev/api/whatsapp/send-template

Headers:
┌──────────────┬──────────────────────┐
│ Content-Type │ application/json     │
└──────────────┴──────────────────────┘

Custom Data:
┌──────────────┬─────────────────────────────────────┐
│ to           │ {{contact.phone}}                   │
├──────────────┼─────────────────────────────────────┤
│ templateName │ welcome                             │
├──────────────┼─────────────────────────────────────┤
│ variables    │ {"name":"{{contact.first_name}}"}   │
└──────────────┴─────────────────────────────────────┘
```

**Result:** Sends "Hi John this new automation working checking"

---

### Option 2: Using Template ID

**Custom Data:**
```
┌──────────────┬─────────────────────────────────────┐
│ to           │ {{contact.phone}}                   │
├──────────────┼─────────────────────────────────────┤
│ templateId   │ tpl_1760729292502                   │
├──────────────┼─────────────────────────────────────┤
│ variables    │ {"name":"{{contact.first_name}}"}   │
└──────────────┴─────────────────────────────────────┘
```

---

## 🎨 How to Create New Templates

### Method 1: Via WhatsApp Tab Interface

1. **Open:** `https://YOUR-NGROK-URL.ngrok-free.dev/ghl-whatsapp-tab.html`
2. **Click:** "Templates" or "Automation" section
3. **Create new template:**
   - Name: `booking_confirmation`
   - Content: `Hello {name}! Your appointment on {date} at {time} is confirmed. See you soon!`
   - Variables: `{name}`, `{date}`, `{time}`
4. **Save**

### Method 2: Via API

**Open Postman or use curl:**

```bash
POST https://YOUR-NGROK-URL.ngrok-free.dev/api/templates

Body:
{
  "id": "tpl_booking_confirm",
  "name": "booking_confirmation",
  "content": "Hello {name}! Your appointment on {date} at {time} is confirmed.",
  "category": "booking"
}
```

---

## 📝 Template Examples

### 1. Welcome Message
```
Name: welcome
Content: Hi {name}! Welcome to {company}. How can we help you today?
Variables: {name}, {company}
```

**GHL Custom Data:**
```json
{
  "to": "{{contact.phone}}",
  "templateName": "welcome",
  "variables": {
    "name": "{{contact.first_name}}",
    "company": "ABC Company"
  }
}
```

---

### 2. Appointment Reminder
```
Name: appointment_reminder
Content: Hi {name}! Reminder: Your appointment is on {date} at {time}. Reply CONFIRM to confirm.
Variables: {name}, {date}, {time}
```

**GHL Custom Data:**
```json
{
  "to": "{{contact.phone}}",
  "templateName": "appointment_reminder",
  "variables": {
    "name": "{{contact.first_name}}",
    "date": "{{appointment.start_date}}",
    "time": "{{appointment.start_time}}"
  }
}
```

---

### 3. Order Confirmation
```
Name: order_confirmation
Content: Thank you {name}! Order #{order_id} confirmed. Total: ${amount}. Estimated delivery: {delivery_date}
Variables: {name}, {order_id}, {amount}, {delivery_date}
```

**GHL Custom Data:**
```json
{
  "to": "{{contact.phone}}",
  "templateName": "order_confirmation",
  "variables": {
    "name": "{{contact.first_name}}",
    "order_id": "{{custom_values.order_id}}",
    "amount": "{{custom_values.order_amount}}",
    "delivery_date": "{{custom_values.delivery_date}}"
  }
}
```

---

### 4. Payment Received
```
Name: payment_received
Content: Hi {name}! We received your payment of ${amount}. Receipt #{receipt_id}. Thank you!
Variables: {name}, {amount}, {receipt_id}
```

**GHL Custom Data:**
```json
{
  "to": "{{contact.phone}}",
  "templateName": "payment_received",
  "variables": {
    "name": "{{contact.first_name}}",
    "amount": "{{payment.amount}}",
    "receipt_id": "{{payment.receipt_number}}"
  }
}
```

---

## 🎯 Complete GHL Workflow Example

### Scenario: Send Welcome Message When Tag is Added

**Step 1: GHL Workflow Trigger**
```
Trigger: Contact Tag Applied
Tag Name: "send-welcome"
```

**Step 2: Webhook Action**
```
Method: POST
URL: https://kathi-sensational-rosalyn.ngrok-free.dev/api/whatsapp/send-template

Headers:
Content-Type: application/json

Custom Data:
to: {{contact.phone}}
templateName: welcome
variables: {"name":"{{contact.first_name}}"}
```

**Step 3: Save & Test**

---

## 📋 How to Format Variables Object in GHL

### Important: Variables Must Be Valid JSON!

**✅ CORRECT:**
```json
{"name":"{{contact.first_name}}","company":"ABC Corp"}
```

**✅ CORRECT (with multiple variables):**
```json
{"name":"{{contact.first_name}}","date":"{{appointment.date}}","time":"{{appointment.time}}"}
```

**❌ WRONG (missing quotes):**
```
{name:{{contact.first_name}}}
```

**❌ WRONG (single quotes instead of double):**
```
{'name':'{{contact.first_name}}'}
```

---

## 🔍 Testing Your Template

### Method 1: Test via Browser/Postman

```bash
POST https://YOUR-NGROK-URL.ngrok-free.dev/api/whatsapp/send-template

Body:
{
  "to": "+918123133382",
  "templateName": "welcome",
  "variables": {
    "name": "Prem"
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Template message sent successfully",
  "sentMessage": {
    "to": "+918123133382",
    "template": "welcome",
    "content": "Hi Prem this new automation working checking"
  }
}
```

---

### Method 2: Test via GHL Workflow

1. **Create test workflow**
2. **Add tag to contact** (e.g., "test-template")
3. **Check server logs** for template processing
4. **Check WhatsApp mobile** for message
5. **Check WhatsApp tab** for message sync

---

## 📊 Server Logs (What You'll See)

**When template is triggered:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 TEMPLATE MESSAGE REQUEST RECEIVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Full request body: { ... }
📞 Phone: +918123133382
📋 Template Name: welcome
🔧 Variables: { name: 'Prem' }
✅ Found template: welcome
📝 Template content: Hi {name} this new automation working checking
✅ Message after variable replacement: Hi Prem this new automation working checking
✅ WhatsApp template message sent successfully
🔄 Auto-syncing template message to GHL...
✅ Template message synced to GHL successfully
```

---

## 🎨 Creating Multi-Variable Templates

### Example: Comprehensive Booking Template

**Create Template:**
```
Name: booking_details
Content: 
Hello {name}!

📅 Appointment Confirmed
Service: {service}
Date: {date}
Time: {time}
Location: {location}
Amount: ${amount}

Need to reschedule? Reply RESCHEDULE
Questions? Reply HELP

See you soon!
- {company}
```

**GHL Custom Data:**
```json
{
  "to": "{{contact.phone}}",
  "templateName": "booking_details",
  "variables": {
    "name": "{{contact.first_name}}",
    "service": "{{appointment.title}}",
    "date": "{{appointment.start_date}}",
    "time": "{{appointment.start_time}}",
    "location": "{{appointment.location}}",
    "amount": "{{appointment.amount}}",
    "company": "Your Company Name"
  }
}
```

---

## 🆘 Troubleshooting

### Error: "Template not found"

**Check:**
1. Template name spelling is correct
2. Template exists in system
3. Use exact name (case-sensitive!)

**Fix:**
```bash
# List all templates
GET https://YOUR-NGROK-URL.ngrok-free.dev/api/templates
```

---

### Error: "Phone number is required"

**Check:**
- GHL is sending `{{contact.phone}}` correctly
- Contact has a valid phone number
- Custom Data has `to` field

**Fix:** Check GHL contact has phone number filled in.

---

### Error: Variables not replaced

**Check:**
- Variables object is valid JSON
- Variable names match template placeholders
- Using `{name}` not `{{name}}`

**Example:**
```
Template: "Hi {name}"        ← Single braces!
Variables: {"name": "John"}  ← Correct
Result: "Hi John"
```

---

### Message sent but not syncing to GHL

**Check server logs for:**
```
✅ Template message synced to GHL successfully
```

**If you see error:**
```
❌ Error syncing template message to GHL: [error]
```

**Fix:** Contact might not exist in GHL. Create contact first.

---

## 📋 Template Best Practices

### 1. Keep Templates Short
- ✅ Under 1000 characters
- ✅ Clear and concise
- ❌ Don't send essays

### 2. Use Clear Variable Names
- ✅ `{name}`, `{date}`, `{amount}`
- ❌ `{var1}`, `{x}`, `{temp}`

### 3. Include Call-to-Action
- ✅ "Reply CONFIRM to confirm"
- ✅ "Click here: {link}"
- ✅ "Call us: {phone}"

### 4. Professional Formatting
- ✅ Use line breaks
- ✅ Use emojis sparingly (📅 ✅ 💬)
- ✅ Keep consistent brand voice

---

## 🎯 Advanced: Dynamic Template Selection

**Scenario:** Send different templates based on contact type

**GHL Workflow:**
```
IF contact has tag "VIP"
  → Webhook with templateName: "vip_welcome"
ELSE IF contact has tag "New"
  → Webhook with templateName: "new_customer_welcome"
ELSE
  → Webhook with templateName: "standard_welcome"
```

---

## ✅ Quick Reference

| What | Value |
|------|-------|
| **Template Endpoint** | `/api/whatsapp/send-template` |
| **Method** | POST |
| **Required Fields** | `to`, `templateName` or `templateId` |
| **Optional Field** | `variables` (JSON object) |
| **Your Template** | `welcome` with `{name}` variable |
| **Template ID** | `tpl_1760729292502` |

---

## 🚀 Next Steps

1. ✅ **Restart server** (to load new endpoint)
2. ✅ **Test existing "welcome" template**
3. ✅ **Create more templates** for your use cases
4. ✅ **Set up GHL workflows** with template webhooks
5. ✅ **Monitor server logs** for debugging

---

## 📝 Summary

**You can now:**
- ✅ Send template messages from GHL
- ✅ Use variables like `{{contact.first_name}}`
- ✅ Auto-sync to GHL conversations
- ✅ Track in WhatsApp tab
- ✅ See delivery on mobile

**RESTART SERVER NOW to use templates!** 🚀

---

**Example Complete Workflow:**

```
GHL Trigger: Tag "welcome" added
    ↓
GHL Webhook: POST /api/whatsapp/send-template
    ↓
Server: Loads template "welcome"
    ↓
Server: Replaces {name} with "Prem"
    ↓
WhatsApp: Sends "Hi Prem this new automation working checking"
    ↓
GHL: Message synced to conversation
    ↓
✅ Done!
```

