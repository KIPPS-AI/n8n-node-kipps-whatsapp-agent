# n8n-nodes-kipps-whatsapp-agent

n8n community node for sending WhatsApp template messages via Kipps.AI API.

## ✨ Features

- **Auto-fetches templates** - No need to manually get template list
- **Template dropdown** - Select template from auto-populated list
- **Auto-fills components** - Template components automatically filled when you select a template
- **Simple workflow** - Just select template, enter phone + parameters, and send!

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

### Step 2: Understanding Templates

The node **automatically fetches all available templates** when you open it. You don't need to manually get templates or copy components - everything is handled automatically!

**What happens:**
1. When you open the node, it fetches all templates using your credentials
2. Templates appear in a dropdown for easy selection
3. When you select a template, components are auto-filled
4. You only need to enter: phone number and parameters

**Note:** You can still view templates via API or dashboard if needed, but it's not required for using the node.

### Step 3: Create Credentials in n8n

1. In your n8n workflow, add the **"Kipps.AI WhatsApp"** node
2. Click on the node → **"Create New Credential"**
3. Select **"Kipps.AI API"**
4. Enter:
   - **Bearer Token**: Your Bearer token
   - **Organization ID**: Your organization UUID
5. Click **"Save"**

### Step 4: Configure the Node

The node is **super simple** - just 3 steps:

#### Required Fields:

1. **To** (Phone Number)
   - Enter recipient phone number
   - Format: `91XXXXXXXXXX` (country code 91 + number, digits only)
   - Required: ✅ Yes

2. **Template** (Dropdown)
   - Click dropdown → See all available templates
   - Select the template you want to send
   - **Templates are auto-fetched** using your credentials
   - Required: ✅ Yes

3. **Template Components (JSON)**
   - **Auto-filled automatically** when you select a template
   - Visible for verification - you can view/edit if needed
   - Usually you don't need to change this
   - Required: ✅ Yes (but auto-filled)

4. **Parameters (JSON)**
   - Enter template parameters based on template type
   - Format depends on your template (see examples below)
   - Required: ✅ Yes

#### Optional Fields:

5. **Agent UUID**
   - Your WhatsApp agent UUID (if applicable)
   - Leave empty if not needed

6. **Conversation ID**
   - Existing conversation ID to continue a thread
   - Leave empty to create new conversation

**That's it!** Select template → Enter phone + parameters → Execute!

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

**Node Configuration:**
- **To**: `91XXXXXXXXXX`
- **Template**: Select `real_estate_webinar` from dropdown
- **Template Components**: ✅ Auto-filled (visible for verification)
- **Parameters**: `{"body": []}`
- **Agent UUID**: (empty)
- **Conversation ID**: (empty)

**Result:** Sends the template message without any dynamic parameters.

**What happens:**
1. You select template from dropdown → Components auto-fill
2. You enter phone number and parameters
3. Click Execute → Message sent!

---

### Example 2: Send NAMED Template

**Node Configuration:**
- **To**: `91XXXXXXXXXX`
- **Template**: Select `aha_smart_homes` from dropdown
- **Template Components**: ✅ Auto-filled (visible for verification)
- **Parameters**: 
  ```json
  {
    "body": [
      {"name": "name", "value": "John Doe"}
    ]
  }
  ```

**Result:** Sends message with "John Doe" replacing `{{name}}` in the template.

---

### Example 3: Send POSITIONAL Template

**Node Configuration:**
- **To**: `91XXXXXXXXXX`
- **Template**: Select `aha_homes_consultation` from dropdown
- **Template Components**: ✅ Auto-filled (visible for verification)
- **Parameters**: 
  ```json
  {
    "body": ["Arav", "5 PM", "30-oct-2025"]
  }
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
- **Template**: Select `webinar_invitation` from dropdown
- **Template Components**: ✅ Auto-filled
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

## 🔍 Understanding Template Parameters

When you select a template from the dropdown, you need to provide parameters based on the template type:

### Template Types:

1. **NAMED Templates** (uses `{{name}}`, `{{industry}}`, etc.)
   - Parameters format: `{"body": [{"name": "param1", "value": "value1"}]}`
   - Example: `{"body": [{"name": "name", "value": "John"}]}`

2. **POSITIONAL Templates** (uses `{{1}}`, `{{2}}`, etc.)
   - Parameters format: `{"body": ["value1", "value2"]}`
   - Example: `{"body": ["John", "Order123"]}`

3. **No Parameters**
   - Parameters format: `{"body": []}`

**Note:** The node automatically handles template components - you don't need to worry about that!

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

- ✅ Make sure you selected a template from the dropdown (don't type manually)
- ✅ Verify template components field is auto-filled (should show components JSON)
- ✅ Check your credentials are correct
- ✅ Ensure template is APPROVED in Kipps.AI dashboard

### Template dropdown is empty

- ✅ Check your credentials are saved correctly
- ✅ Verify Bearer Token and Organization ID are valid
- ✅ Check n8n console for API errors
- ✅ Ensure you have approved templates in your Kipps.AI account

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
  "to": "91XXXXXXXXXX",
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
- [ ] Create credentials in n8n
- [ ] Add "Kipps.AI WhatsApp" node to workflow
- [ ] Configure node:
  - [ ] **To**: Enter phone number
  - [ ] **Template**: Select from dropdown (auto-fetched)
  - [ ] **Template Components**: ✅ Auto-filled (visible for verification)
  - [ ] **Parameters**: Enter JSON based on template type
- [ ] Test workflow execution
- [ ] Verify WhatsApp message is sent successfully

---

**Happy Automating! 🚀**
