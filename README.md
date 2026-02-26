# n8n-nodes-kipps-whatsapp-agent

n8n community node for sending WhatsApp template messages via Kipps.AI API.

## 📦 Installation

### For Self-Hosted n8n

**Option 1: Install via npm (Recommended)**

```bash
cd ~/.n8n/custom
npm install n8n-nodes-kipps-whatsapp-agent
```

**Option 2: Install from Local Directory**

```bash
cd ~/.n8n/custom
npm install /path/to/n8n-node-kipps-whatsapp-agent
```

**Option 3: Install from GitHub**

```bash
cd ~/.n8n/custom
npm install git+https://github.com/KIPPS-AI/n8n-node-kipps-whatsapp-agent.git
```

After installation, **restart your n8n server** to load the new node.

---

## 🚀 Complete Workflow Guide

### Step 1: Get Your Credentials

You need two things from your Kipps.AI dashboard:

1. **Bearer Token**: Your API authentication token
2. **Organization ID**: Your organization UUID (e.g., `bb51f8ad-4ee8-40cf-98aa-64b9c4b3eae9`)

### Step 2: Get Available Templates and Components

Templates are auto-fetched by the node using your saved credentials. You can still view them via API or dashboard if you want, but you **don’t need to copy components manually**.

1. **Use the Kipps.AI API** to fetch templates:
   ```
   GET https://backend.kipps.ai/integrations/get-whatsapp-templates/
   Headers:
     Authorization: Bearer YOUR_TOKEN
     X-Organization-ID: YOUR_ORG_ID
   ```

2. **Or check your Kipps.AI dashboard** for approved templates

Each template has:
- **name**: the template name
- **components**: used automatically by the node when you select a template

**Example template response:**
```json
{
  "name": "real_estate_webinar",
  "parameter_format": "POSITIONAL",
  "components": [
    {
      "type": "BODY",
      "text": "Hi, \n\nQuick question, are you fully utilising your cold lead database?..."
    }
  ]
}
```

The node now **auto-fetches templates** and **auto-fills template components** after you select a template in the dropdown.

### Step 3: Create Credentials in n8n

1. In your n8n workflow, add the **"Kipps.AI WhatsApp"** node
2. Click on the node → **"Create New Credential"**
3. Select **"Kipps.AI API"**
4. Enter:
   - **Bearer Token**: Your Bearer token
   - **Organization ID**: Your organization UUID
5. Click **"Save"**

### Step 4: Configure the Node

#### Required Fields:

1. **To** (Phone Number)
   - Format: E.164 format (e.g., `918520811855` or `+919876543210`)
   - Required: ✅ Yes

2. **Template**
   - Select from dropdown (auto-fetched)
   - Required: ✅ Yes

3. **Parameters (JSON)**
   - Format depends on your template type (see below)
   - Required: ✅ Yes

4. **Template Components**
   - Auto-filled from the selected template
   - You don’t need to paste anything

#### Optional Fields:

5. **Agent UUID**
   - Your WhatsApp agent UUID (if applicable)
   - Leave empty if not needed

6. **Conversation ID**
   - Existing conversation ID to continue a thread
   - Leave empty to create new conversation

---

## 📝 Parameters Format Guide

### For NAMED Templates ({{name}} format)

If your template uses named parameters like `{{name}}`, `{{industry}}`, etc.:

**Format:**
```json
{
  "body": [
    {"name": "param1", "value": "value1"},
    {"name": "param2", "value": "value2"}
  ]
}
```

**Example:**
```json
{
  "body": [
    {"name": "industry", "value": "IT"},
    {"name": "date_time", "value": "2024-12-15 11:00 AM"},
    {"name": "webinar_title", "value": "AI Automation Webinar"}
  ]
}
```

### For POSITIONAL Templates ({{1}}, {{2}} format)

If your template uses positional parameters like `{{1}}`, `{{2}}`, etc.:

**Format:**
```json
{
  "body": ["value1", "value2", "value3"]
}
```

**Example:**
```json
{
  "body": ["John", "Order123", "2024-12-15"]
}
```

### For Templates with No Parameters

If your template has no parameters:

**Format:**
```json
{
  "body": []
}
```

Or simply:
```json
{}
```

---

## 💡 Complete Example Workflows

### Example 1: Send Simple Template (No Parameters)

**Template Details from API:**
```json
{
  "name": "real_estate_webinar",
  "parameter_format": "POSITIONAL",
  "components": [
    {
      "type": "BODY",
      "text": "Hi, \n\nQuick question, are you fully utilising your cold lead database?\nMost real estate teams miss out on conversions because follow-ups are delayed or inconsistent.\n\nWe here at Kipps.AI are hosting a webinar on 15 Dec at 11 AM showing how AI automates follow-ups, responds in seconds, and helps revive cold leads.\n\nRegister here: https://www.kipps.ai/webinar/10x-your-client-reach-with-ai-voice-agents-1\n\nPS: Attendees will get a pilot solution"
    }
  ]
}
```

**Node Configuration:**
- **To**: `918520811855`
- **Template**: select `real_estate_webinar` in dropdown
- **Parameters**: `{"body": []}`
- **Template Components**: auto-filled
  ```json
  [
    {
      "type": "BODY",
      "text": "Hi, \n\nQuick question, are you fully utilising your cold lead database?\nMost real estate teams miss out on conversions because follow-ups are delayed or inconsistent.\n\nWe here at Kipps.AI are hosting a webinar on 15 Dec at 11 AM showing how AI automates follow-ups, responds in seconds, and helps revive cold leads.\n\nRegister here: https://www.kipps.ai/webinar/10x-your-client-reach-with-ai-voice-agents-1\n\nPS: Attendees will get a pilot solution"
    }
  ]
  ```
- **Agent UUID**: (empty)
- **Conversation ID**: (empty)

**Result:** Sends the template message without any dynamic parameters.

**Note:** Template Components is auto-filled after you select a template.

---

### Example 2: Send NAMED Template

**Template Details from API:**
```json
{
  "name": "aha_smart_homes",
  "parameter_format": "NAMED",
  "components": [
    {
      "type": "BODY",
      "text": "Hi {{name}}, Aarav here from AHA Smart Homes 👋\nIf you face any issue or need help adding new devices, just reply here — we'll connect you to a support expert instantly."
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "QUICK_REPLY",
          "text": "Add New Device"
        }
      ]
    }
  ]
}
```

**Node Configuration:**
- **To**: `918520811855`
- **Template**: select `aha_smart_homes` in dropdown
- **Parameters**: 
  ```json
  {
    "body": [
      {"name": "name", "value": "John Doe"}
    ]
  }
  ```
- **Template Components**: auto-filled
  ```json
  [
    {
      "type": "BODY",
      "text": "Hi {{name}}, Aarav here from AHA Smart Homes 👋\nIf you face any issue or need help adding new devices, just reply here — we'll connect you to a support expert instantly."
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "QUICK_REPLY",
          "text": "Add New Device"
        }
      ]
    }
  ]
  ```

**Result:** Sends message with "John Doe" replacing `{{name}}` in the template.

---

### Example 3: Send POSITIONAL Template

**Template Details from API:**
```json
{
  "name": "aha_homes_consultation",
  "parameter_format": "POSITIONAL",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Consultation Booked"
    },
    {
      "type": "BODY",
      "text": "Your consultation is booked with {{1}} for {{2}} on {{3}} \nYou can reschedule anytime using the button below. Thank you for choosing AHA Smart Homes!",
      "example": {
        "body_text": [
          ["Arav", "5 PM", "30-oct-2025"]
        ]
      }
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "QUICK_REPLY",
          "text": "Reschedule Consultation"
        }
      ]
    }
  ]
}
```

**Node Configuration:**
- **To**: `918520811855`
- **Template**: select `aha_homes_consultation` in dropdown
- **Parameters**: 
  ```json
  {
    "body": ["Arav", "5 PM", "30-oct-2025"]
  }
  ```
- **Template Components**: auto-filled
  ```json
  [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Consultation Booked"
    },
    {
      "type": "BODY",
      "text": "Your consultation is booked with {{1}} for {{2}} on {{3}} \nYou can reschedule anytime using the button below. Thank you for choosing AHA Smart Homes!"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "QUICK_REPLY",
          "text": "Reschedule Consultation"
        }
      ]
    }
  ]
  ```

**Result:** Sends message with:
- `{{1}}` replaced by "Arav"
- `{{2}}` replaced by "5 PM"
- `{{3}}` replaced by "30-oct-2025"

---

### Example 4: Using in a Workflow with Data from Previous Nodes

If you have data from a previous node (e.g., from a database or API):

**Workflow:**
1. **HTTP Request** node → Fetches customer data
2. **Kipps.AI WhatsApp** node → Sends template

**Kipps.AI WhatsApp Node Configuration:**
- **To**: `{{ $json.phoneNumber }}` (from previous node)
- **Template**: select `webinar_invitation` in dropdown
- **Parameters**: 
  ```json
  {
    "body": [
      "{{ $json.eventName }}",
      "{{ $json.hostName }}"
    ]
  }
  ```

This uses dynamic data from the previous node in your workflow.

---

## 🔍 How to Find Template Details

1. **Get templates list** from API:
   ```
   GET https://backend.kipps.ai/integrations/get-whatsapp-templates/
   ```

2. **Find your template** in the response array

3. **Copy these fields:**
   - **`name`**: Use this in "Template Name" field
   - **`parameter_format`**: Determines parameter format
     - `"NAMED"` → Use `{"body": [{"name": "...", "value": "..."}]}`
     - `"POSITIONAL"` → Use `{"body": ["value1", "value2"]}`
     - `"NA"` or missing → Use `{"body": []}`
   - **`components`**: used by the node automatically (no copy/paste needed)

4. **Check `components` array for examples:**
   - Look for `example.body_text_named_params` (for NAMED)
   - Look for `example.body_text` (for POSITIONAL)

**⚠️ CRITICAL:** The `components` array is REQUIRED - without it, you'll get an empty message!

---

## ✅ Testing Your Node

### Test in n8n:

1. Add **"Kipps.AI WhatsApp"** node to workflow
2. Configure with test data
3. Click **"Execute Workflow"**
4. Check the output:
   - Success: You'll see the API response with message details
   - Error: Check the error message for issues

### Expected Success Response:

```json
{
  "result": {
    "id": 55858,
    "role": "assistant",
    "content": "Your message content...",
    "delivery_status": "sent",
    "message_id": "wamid.HBgM...",
    ...
  }
}
```

---

## 🐛 Troubleshooting

### Node doesn't appear in n8n

- ✅ Make sure you installed in `~/.n8n/custom/`
- ✅ Restart n8n after installation
- ✅ Check n8n console for errors
- ✅ Verify `dist` folder exists in installed package

### "Invalid credentials" error

- ✅ Check Bearer Token is correct
- ✅ Check Organization ID is correct
- ✅ Verify credentials are saved in n8n

### "Template not found" error

- ✅ Verify template name is exact (case-sensitive)
- ✅ Check template is APPROVED in Kipps.AI dashboard
- ✅ Ensure template exists in your organization

### "Invalid parameters" error

- ✅ Check parameter format matches template type (NAMED vs POSITIONAL)
- ✅ Verify JSON is valid
- ✅ Ensure all required parameters are provided
- ✅ Check parameter count matches template requirements

### Parameters not working

- ✅ For NAMED: Use `{"body": [{"name": "...", "value": "..."}]}`
- ✅ For POSITIONAL: Use `{"body": ["value1", "value2"]}`
- ✅ Don't forget the `"body"` key in parameters object

### Empty message received

- ✅ Make sure you selected the correct template in the dropdown
- ✅ Make sure your credentials are correct

---

## 📚 API Details

### Endpoint Used

```
POST https://backend.kipps.ai/integrations/whatsapp-agent/send-template/
```

### Headers (Automatically Added)

- `Authorization: Bearer YOUR_TOKEN`
- `X-Organization-ID: YOUR_ORG_ID`
- `Content-Type: application/json`

### Request Body

```json
{
  "to": "918520811855",
  "template_name": "real_estate_webinar",
  "parameters": {
    "body": []
  },
  "template_components": [
    {
      "type": "BODY",
      "text": "Your message text here..."
    }
  ],
  "agent_uuid": "optional-uuid",
  "conversation_id": "optional-conversation-id"
}
```

**⚠️ Note:** `template_components` is REQUIRED - the API will send an empty message if this is missing or empty!

---

## 🔗 Links

- **Kipps.AI Documentation**: https://docs.kipps.ai/docs/v1.2.2/developer-api
- **GitHub Repository**: https://github.com/KIPPS-AI/n8n-node-kipps-whatsapp-agent
- **n8n Documentation**: https://docs.n8n.io/

---

## 📄 License

MIT

---

## 🤝 Support

For issues or questions:
- **GitHub Issues**: https://github.com/KIPPS-AI/n8n-node-kipps-whatsapp-agent/issues
- **Kipps.AI Support**: Check Kipps.AI documentation

---

## 🎯 Quick Start Checklist

- [ ] Install package: `npm install n8n-nodes-kipps-whatsapp-agent`
- [ ] Restart n8n server
- [ ] Get Bearer Token and Organization ID from Kipps.AI
- [ ] Get list of available templates
- [ ] **Copy the `components` array from your template** ⚠️
- [ ] Create credentials in n8n
- [ ] Add "Kipps.AI WhatsApp" node to workflow
- [ ] Configure node with:
  - [ ] Template name
  - [ ] Parameters (JSON)
  - [ ] Template Components auto-filled
- [ ] Test workflow execution
- [ ] Verify WhatsApp message is sent (not empty)

---

**Happy Automating! 🚀**
