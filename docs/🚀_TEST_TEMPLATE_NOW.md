# 🚀 TEST YOUR TEMPLATE NOW - Quick Start!

## ✅ You Already Have a Template!

**Template Name:** `welcome`  
**Content:** `Hi {name} this new automation working checking`  
**Variable:** `{name}`

---

## 🎯 STEP 1: Restart Server (REQUIRED!)

**Press Ctrl+C in server terminal, then:**

```bash
npm start
```

Or: `.\RESTART_NOW.bat`

---

## 🎯 STEP 2: Configure GHL Workflow

### Go to GHL → Workflows → Your Automation

**Update your webhook action:**

**Change URL from:**
```
https://kathi-sensational-rosalyn.ngrok-free.dev/api/whatsapp/send
```

**To:**
```
https://kathi-sensational-rosalyn.ngrok-free.dev/api/whatsapp/send-template
```

**Update Custom Data:**

**Delete all current Custom Data rows**

**Add these 3 rows:**

| Key | Value |
|-----|-------|
| `to` | `{{contact.phone}}` |
| `templateName` | `welcome` |
| `variables` | `{"name":"{{contact.first_name}}"}` |

**Important:** 
- `templateName` value is just `welcome` (no quotes, no brackets!)
- `variables` value must be EXACTLY: `{"name":"{{contact.first_name}}"}`
  - Use **double quotes** `"` not single quotes `'`
  - Include the GHL variable `{{contact.first_name}}`

---

## 🎯 STEP 3: Test the Workflow

### Option A: Test via GHL

1. **Save your workflow**
2. **Click "Test" button**
3. **Watch server terminal**

**You should see:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 TEMPLATE MESSAGE REQUEST RECEIVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 Phone: +918123133382
📋 Template Name: welcome
🔧 Variables: { name: 'PREM' }
✅ Found template: welcome
📝 Template content: Hi {name} this new automation working checking
✅ Message after variable replacement: Hi PREM this new automation working checking
✅ WhatsApp template message sent successfully
✅ Template message synced to GHL successfully
```

**Check:**
- ✅ WhatsApp mobile receives: "Hi PREM this new automation working checking"
- ✅ WhatsApp tab shows the message
- ✅ GHL conversation shows the message

---

### Option B: Test via Browser (Postman/Thunder Client)

**Open Chrome/Postman:**

```bash
POST https://kathi-sensational-rosalyn.ngrok-free.dev/api/whatsapp/send-template

Headers:
Content-Type: application/json

Body (JSON):
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

## 📋 GHL Workflow Screenshot Reference

**Your webhook should look like this:**

```
┌─────────────────────────────────────────────────┐
│ Action: Custom Webhook                          │
├─────────────────────────────────────────────────┤
│ Method: POST                                     │
│                                                  │
│ URL:                                             │
│ https://kathi-sensational-rosalyn.ngrok-free.dev/api/whatsapp/send-template
│                                                  │
│ Headers:                                         │
│ ┌──────────────┬──────────────────────┐         │
│ │ Content-Type │ application/json     │         │
│ └──────────────┴──────────────────────┘         │
│                                                  │
│ Custom Data:                                     │
│ ┌──────────────┬────────────────────────────┐   │
│ │ to           │ {{contact.phone}}          │   │
│ ├──────────────┼────────────────────────────┤   │
│ │ templateName │ welcome                    │   │
│ ├──────────────┼────────────────────────────┤   │
│ │ variables    │ {"name":"{{contact.first_name}}"}│
│ └──────────────┴────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Create More Templates!

### Example: Appointment Reminder

**Open WhatsApp tab or use API:**

```bash
POST https://YOUR-NGROK-URL.ngrok-free.dev/api/templates

Body:
{
  "id": "tpl_appointment",
  "name": "appointment_reminder",
  "content": "Hi {name}! Reminder: Your appointment is on {date} at {time}. Reply CONFIRM to confirm.",
  "category": "appointments"
}
```

**Then use in GHL:**
```
Custom Data:
to: {{contact.phone}}
templateName: appointment_reminder
variables: {"name":"{{contact.first_name}}","date":"{{appointment.start_date}}","time":"{{appointment.start_time}}"}
```

---

## ✅ Comparison: Plain Text vs Template

### OLD WAY (Plain Text):

**Custom Data:**
```
to: {{contact.phone}}
message: Hello {{contact.first_name}}! Automation test
```

**Issues:**
- ❌ Have to write message in every workflow
- ❌ Hard to maintain consistency
- ❌ Can't update message centrally

---

### NEW WAY (Template):

**Custom Data:**
```
to: {{contact.phone}}
templateName: welcome
variables: {"name":"{{contact.first_name}}"}
```

**Benefits:**
- ✅ Write template once, use everywhere
- ✅ Update template, all workflows update
- ✅ Professional, consistent messaging
- ✅ Track which template was used
- ✅ A/B test different templates

---

## 🆘 Troubleshooting

### Error: "Template not found: welcome"

**Fix:** Restart server to load templates

```bash
npm start
```

---

### Error: "Phone number is required"

**Check:**
- Contact has phone number in GHL
- `to` field is set to `{{contact.phone}}`

---

### Variables not replaced (shows `{name}` in message)

**Check:**
- `variables` field is valid JSON
- Using **double quotes** `"` not single quotes `'`
- Variable names match template (`{name}` matches `"name":"..."`)

**Correct:**
```json
{"name":"{{contact.first_name}}"}
```

**Wrong:**
```
{'name':'{{contact.first_name}}'}  ❌ Single quotes
{name:{{contact.first_name}}}      ❌ Missing quotes
```

---

## 📝 Quick Reference

| Item | Value |
|------|-------|
| **Endpoint** | `/api/whatsapp/send-template` |
| **Your Template** | `welcome` |
| **Template Variable** | `{name}` |
| **Required in GHL** | `to`, `templateName`, `variables` |

---

## 🎯 Next Steps After Testing

1. ✅ **Create more templates** for different scenarios:
   - Welcome messages
   - Appointment reminders
   - Payment confirmations
   - Order updates
   - Follow-ups

2. ✅ **Set up multiple workflows:**
   - New contact → Welcome template
   - Appointment booked → Reminder template
   - Payment received → Confirmation template

3. ✅ **Monitor and improve:**
   - Check server logs
   - Track delivery
   - Update templates based on responses

---

## 🚀 READY TO TEST!

1. **Restart server** (Ctrl+C, then `npm start`)
2. **Update GHL webhook** URL and Custom Data
3. **Test workflow**
4. **Check WhatsApp mobile, tab, and GHL**

**Let me know what happens!** 🎉

