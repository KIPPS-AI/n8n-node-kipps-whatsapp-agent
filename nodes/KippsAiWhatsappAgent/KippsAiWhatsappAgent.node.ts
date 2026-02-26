import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export class KippsAiWhatsappAgent implements INodeType {
	methods = {
		loadOptions: {
			async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = 'https://backend.kipps.ai/integrations/get-whatsapp-templates/';
				const method: IHttpRequestMethods = 'GET';

				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'kippsAiApi', {
					method,
					url: endpoint,
					headers: { 'Content-Type': 'application/json' },
				});

				const templates = Array.isArray(response) ? response : [];

				// Store full template data in value (as JSON string) to avoid fetching again
				return templates
					.filter((t: any) => t?.name)
					.map((t: any) => ({
						name: String(t.name),
						value: JSON.stringify(t), // Store full template object
					}));
			},
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Kipps.AI WhatsApp',
		name: 'kippsAiWhatsapp',
		icon: { light: 'file:./whatsapp-light.svg', dark: 'file:./whatsapp-dark.svg' },
		group: ['transform'],
		version: 1,
		description: 'Send WhatsApp template message using Kipps.AI',
		defaults: {
			name: 'Kipps.AI WhatsApp',
		},

		inputs: ['main'],
		outputs: ['main'],

		credentials: [
			{
				name: 'kippsAiApi',
				required: true,
			},
		],

		properties: [
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				placeholder: '91XXXXXXXXXX',
				required: true,
				description: 'Recipient phone number in format 91XXXXXXXXXX (country code 91 + number, digits only)',
			},
			{
				displayName: 'Template',
				name: 'templateName',
				type: 'options',
				default: '',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getTemplates',
				},
				description: 'Select a WhatsApp template (auto-fetched)',
			},
			{
				displayName: 'Template Components (JSON)',
				name: 'template_components',
				type: 'json',
				// Auto-derive components from selected template (stored as JSON string in Template field)
				default: '={{ (JSON.parse($parameter["templateName"] || "{}").components) || [] }}',
				required: true,
				description:
					'Template components for the selected template. Auto-filled from the template; you can view or tweak if needed.',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Parameters (JSON)',
				name: 'parameters',
				type: 'json',
				default: '{}',
				required: true,
				description: 'Enter template parameters JSON. Example: {"body": []}',
			},
			{
				displayName: 'Agent UUID',
				name: 'agent_uuid',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Conversation ID',
				name: 'conversation_id',
				type: 'string',
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const to = this.getNodeParameter('to', itemIndex) as string;
			const templateNameParam = this.getNodeParameter('templateName', itemIndex) as string;
			const parametersRaw = this.getNodeParameter('parameters', itemIndex) as unknown;
			const agent_uuid = this.getNodeParameter('agent_uuid', itemIndex, '') as string;
			const conversation_id = this.getNodeParameter('conversation_id', itemIndex, '') as string;
			let template_components = this.getNodeParameter('template_components', itemIndex) as unknown[];

			// Normalise parameters: accept either object or JSON string, always ensure { body: [...] }
			let parameters: { body: unknown } & Record<string, unknown>;
			try {
				if (typeof parametersRaw === 'string') {
					parameters = (JSON.parse(parametersRaw || '{}') ?? {}) as typeof parameters;
				} else if (typeof parametersRaw === 'object' && parametersRaw !== null) {
					parameters = parametersRaw as typeof parameters;
				} else {
					parameters = {} as typeof parameters;
				}
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					`Parameters (JSON) must be valid JSON. Received: ${String(parametersRaw)}`,
				);
			}

			if (parameters.body === undefined) {
				// Default to empty body array if user didn't provide one
				parameters.body = [];
			}

			// Extract template data from dropdown value (stored as JSON string)
			let templateName: string;
			try {
				const templateData = JSON.parse(templateNameParam);
				templateName = templateData.name;
				// Auto-fill components if not already set or empty
				if (!template_components || !Array.isArray(template_components) || template_components.length === 0) {
					template_components = templateData.components || [];
				}

				this.logger.debug(
					`Kipps WhatsApp: Selected template "${templateName}" with components count: ${
						Array.isArray(template_components) ? template_components.length : 0
					}`,
				);
			} catch {
				// Fallback: if value is just a string (old format), use it as template name
				templateName = templateNameParam;
				this.logger.debug(
					`Kipps WhatsApp: Using template name as plain string "${templateName}" (no template metadata available).`,
				);
			}

			// Validate components
			if (!template_components || !Array.isArray(template_components) || template_components.length === 0) {
				throw new NodeOperationError(
					this.getNode(),
					`Template components are required for template "${templateName}". Please select a template from the dropdown.`,
				);
			}

			const endpoint = 'https://backend.kipps.ai/integrations/whatsapp-agent/send-template/';
			const method: IHttpRequestMethods = 'POST';

			const body: {
				to: string;
				template_name: string;
				parameters: object;
				template_components: unknown[];
				agent_uuid?: string;
				conversation_id?: string;
			} = {
				to,
				template_name: templateName,
				parameters,
				template_components,
			};

			if (agent_uuid) {
				body.agent_uuid = agent_uuid;
			}
			if (conversation_id) {
				body.conversation_id = conversation_id;
			}

			try {
				this.logger.debug(
					`Kipps WhatsApp: Final request payload → to="${body.to}", template="${body.template_name}", components=${
						Array.isArray(body.template_components) ? body.template_components.length : 0
					}, hasParams=${Object.keys(body.parameters || {}).length > 0}`,
				);
				this.logger.debug('===== Kipps WhatsApp REQUEST =====');
				this.logger.debug(`Endpoint: ${endpoint}`);
				this.logger.debug(`Body: ${JSON.stringify(body)}`);

				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'kippsAiApi',
					{
						method,
						url: endpoint,
						body,
						headers: { 'Content-Type': 'application/json' },
					},
				);

				this.logger.debug('===== Kipps WhatsApp RESPONSE =====');
				this.logger.debug(JSON.stringify(response));

				returnData.push({
					json: response,
					pairedItem: itemIndex,
				});
			} catch (error: unknown) {
				const err = error as {
					message?: string;
					response?: { data?: unknown };
				};

				this.logger.error('===== Kipps WhatsApp FAILED =====');
				this.logger.error(`Body: ${JSON.stringify(body)}`);
				this.logger.error(`Message: ${err?.message}`);

				if (err?.response?.data) {
					this.logger.error(`API Response: ${JSON.stringify(err.response.data)}`);
				}

				throw new NodeOperationError(
					this.getNode(),
					JSON.stringify(err?.response?.data || err.message),
				);
			}
		}

		return this.prepareOutputData(returnData);
	}
}