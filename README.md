# n8n-nodes-kipps-whatsapp-agent

n8n community node for sending WhatsApp template messages via the Kipps.AI API, with a UX focused on **fast template selection**, **clear previews**, and **auto-generated parameter fields** (no JSON editing needed).

## ✨ Features

- **Template dropdown**: Fetches all **APPROVED** WhatsApp templates from Kipps.AI and lets you pick by name.
- **Template components preview**: Read‑only field that shows BODY / HEADER / BUTTONS content for the selected template.
- **Dynamic parameters UI**:
  - For **NAMED** templates (`{{name}}`): one field per parameter with example hints.
  - For **POSITIONAL** templates (`{{1}}`, `{{2}}`): one field per position with examples.
  - All parameters are entered as normal text inputs, **not JSON**.
- **Validation**: Fails early in n8n if any required parameter field is empty.
- **Clean output**: Returns the raw Kipps.AI API response so you can branch on success/failure.

---

## 📦 Installation

### n8n Cloud or modern self‑host (recommended)

1. Open the n8n editor.
2. Go to **Settings → Community Nodes → Install**.
3. Enter the package name: `n8n-nodes-kipps-whatsapp-agent`.
4. Confirm and restart n8n if prompted.

### Classic self‑host via npm (advanced)

In the n8n custom directory (e.g. `~/.n8n/custom` on Linux/macOS):

```bash
cd ~/.n8n/custom
npm install n8n-nodes-kipps-whatsapp-agent
```

Then restart your n8n instance so the node is loaded.

---

## 🚀 Workflow: How to use the node

### 1. Get Kipps.AI credentials

From the Kipps.AI dashboard you need:

- **Bearer Token**
- **Organization ID** (UUID, e.g. `bb51f8ad-4ee8-40cf-98aa-64b9c4b3eae9`)

### 2. Create credentials in n8n

1. Add the **`Kipps.AI WhatsApp`** node to any workflow.
2. In the node, create new credentials of type **`Kipps.AI API`**.
3. Fill:
   - **Bearer Token**
   - **Organization ID**
4. Save the credentials.

### 3. Node fields (current UX)

- **Credential to connect with**
  - Choose your `Kipps.AI API` credentials.

- **To**
  - Recipient phone number, e.g. `91XXXXXXXXXX` (country code + number, digits only).
  - **Required**.

- **Template**
  - Dropdown with all **APPROVED** templates from Kipps.AI.
  - Stored internally as the template **name**.
  - **Required**.

- **Template Components (preview)**
  - Type: `options` (read‑only).
  - When you select a template, this shows lines like:
    - `1. HEADER (TEXT) – Consultation Booked`
    - `2. BODY – Your consultation is booked with {{1}} for {{2}} on {{3}} …`
    - `3. BUTTONS – Reschedule Consultation`
  - This is **only for review**; it does **not** affect the API request.

- **Parameters**
  - Type: `resourceMapper`.
  - When you open it after selecting a template, the node:
    - Loads the selected template definition from Kipps.AI.
    - Detects whether it is **NAMED** or **POSITIONAL**.
    - Auto‑generates one field per required parameter with example text.
  - You simply fill the generated fields; no JSON required.

- **Agent UUID** (optional)
  - If provided, included in the request body as `agent_uuid`.

- **Conversation ID** (optional)
  - If provided, included as `conversation_id` to continue an existing conversation.

---

## 🧩 How parameters work (UI, not JSON)

### NAMED templates (`parameter_format = "NAMED"`)

Example BODY:

```text
Hi {{name}}, Aarav here from AHA Smart Homes 👋
```

You will see parameter fields like:

- **name (e.g., "User")**

You just type values:

- `name` → `John`

The node converts this to the API format:

```json
{
  "body": [
    { "name": "name", "value": "John" }
  ]
}
```

### POSITIONAL templates (`parameter_format = "POSITIONAL"`)

Example BODY:

```text
Your consultation is booked with {{1}} for {{2}} on {{3}} …
```

You will see fields:

- **Parameter 1 (e.g., "Arav")**
- **Parameter 2 (e.g., "5 PM")**
- **Parameter 3 (e.g., "30-oct-2025")**

You fill:

- `Parameter 1` → `Charan`
- `Parameter 2` → `12am`
- `Parameter 3` → `15-02-2004`

The node converts this to:

```json
{
  "body": ["Charan", "12am", "15-02-2004"]
}
```

### Templates with no parameters

If the node detects zero parameters, the **Parameters** section will show a notice that the message is sent as‑is and no fields are created.

---

## ✅ Typical configuration examples

### 1. Simple non‑personalized broadcast

- **To**: `91XXXXXXXXXX`
- **Template**: `real_estate_webinar`
- **Template Components (preview)**: shows one BODY component (no parameters).
- **Parameters**: no fields shown / nothing to fill.

Result: sends the static webinar invite body text exactly as defined in the template.

### 2. Named parameter template

- **Template**: `aha_smart_homes`
- **Parameters** UI:
  - `name (e.g., "User")` → `Satyam`

Result: `{{name}}` is replaced with `Satyam` automatically.

### 3. Positional parameter template

- **Template**: `aha_homes_consultation`
- **Parameters** UI:
  - `Parameter 1` → `Arav`
  - `Parameter 2` → `5 PM`
  - `Parameter 3` → `30-oct-2025`

Result: the WhatsApp message shows the full sentence with your values and a **Reschedule Consultation** button (from template components).

---

## 🐛 Troubleshooting (current behavior)

- **Template dropdown is empty**
  - Check Kipps.AI credentials (Bearer token, Org ID).
  - Ensure you have **APPROVED** templates.

- **Parameters section shows no fields**
  - Confirm a template is selected.
  - If it has no BODY parameters, this is expected (message is static).

- **Parameters don’t update after changing template**
  - Close and reopen the node, then open **Parameters** again.
  - If still stuck, click the three‑dots (⋮) in the Parameters section and use **Refresh fields**.

- **Execution error: “Required parameter fields are empty”**
  - Some generated parameter fields were left blank; fill all required inputs.

- **Execution error: “Selected template was not found”**
  - The template might have been deleted or renamed in Kipps.AI; reselect a template in the node.

---

## 📚 API details

- **Endpoint**

```text
POST https://backend.kipps.ai/integrations/whatsapp-agent/send-template/
```

- **Headers** (added automatically from credentials)

- `Authorization: Bearer <token>`
- `X-Organization-ID: <organizationId>`
- `Content-Type: application/json`

- **Body shape (conceptual)**

```json
{
  "to": "91XXXXXXXXXX",
  "template_name": "<template name>",
  "template_components": [ /* components from template */ ],
  "parameters": {
    "body": [ /* named or positional values built from UI */ ]
  },
  "agent_uuid": "optional-uuid",
  "conversation_id": "optional-conversation-id"
}
```

---

## 🔗 Links

- **Kipps.AI Documentation**: https://docs.kipps.ai/docs/v1.2.2/developer-api
- **n8n Documentation**: https://docs.n8n.io/

---

## 📄 License

MIT

---

## 🎯 Quick start checklist

- [ ] Install: `n8n-nodes-kipps-whatsapp-agent` via **Community Nodes**.
- [ ] Create `Kipps.AI API` credentials (Bearer token + Organization ID).
- [ ] Add **`Kipps.AI WhatsApp`** node to a workflow.
- [ ] Set **To**, select a **Template**, review **Template Components (preview)**.
- [ ] Open **Parameters** and fill the generated fields.
- [ ] Execute the node and verify the WhatsApp message is delivered.

---

**Happy automating with Kipps.AI on n8n! 🚀**
