# n8n-nodes-kipps-whatsapp-agent

n8n community node for sending WhatsApp template messages via Kipps.AI

## Installation

```bash
npm install n8n-nodes-kipps-whatsapp-agent
```

## Usage

1. Add the "Kipps.AI WhatsApp" node to your n8n workflow
2. Create credentials with your Bearer Token and Organization ID
3. Configure the node:
   - **To**: Recipient phone number (E.164 format)
   - **Template Name**: WhatsApp template name from Kipps.AI
   - **Parameters**: JSON format
     - For NAMED templates: `{"body": [{"name": "param1", "value": "value1"}]}`
     - For POSITIONAL templates: `{"body": ["value1", "value2"]}`
   - **Agent UUID** (optional)
   - **Conversation ID** (optional)
   - **Template Components** (optional)

## Credentials

- **Bearer Token**: Your Kipps.AI Bearer token
- **Organization ID**: Your organization UUID

## License

MIT

## Links

- [Documentation](https://docs.kipps.ai/docs/v1.2.2/developer-api)
- [GitHub Repository](https://github.com/KIPPS-AI/n8n-node-kipps-whatsapp-agent)
