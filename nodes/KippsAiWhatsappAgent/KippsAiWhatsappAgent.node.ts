import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export class KippsAiWhatsapp implements INodeType {
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
				placeholder: '+919876543210',
				required: true,
				description: 'Recipient phone number in E.164 format',
			},
			{
				displayName: 'Template Name',
				name: 'templateName',
				type: 'string',
				default: '',
				required: true,
				description: 'WhatsApp template name created in Kipps portal',
			},
			{
				displayName: 'Parameters (JSON)',
				name: 'parameters',
				type: 'json',
				default: '{}',
				required: true,
				description:
					'For NAMED template ({{name}}): {"body": [{"name": "industry", "value": "IT"}]} \nFor POSITIONAL template ({{1}}): {"body": ["John", "Order123"]}',
			},
			{
				displayName: 'Template Components (JSON)',
				name: 'template_components',
				type: 'json',
				default: '[]',
				required: false,
				description:
					'Optional: Template components array. If not provided, will be fetched automatically.',
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
			const templateName = this.getNodeParameter('templateName', itemIndex) as string;
			const parameters = this.getNodeParameter('parameters', itemIndex) as object;
			const agent_uuid = this.getNodeParameter('agent_uuid', itemIndex, '') as string;
			const conversation_id = this.getNodeParameter('conversation_id', itemIndex, '') as string;
			const template_components = this.getNodeParameter('template_components', itemIndex, null) as
				| unknown[]
				| null;

			const endpoint = 'https://backend.kipps.ai/integrations/whatsapp-agent/send-template/';
			const method: IHttpRequestMethods = 'POST';

			const body: {
				to: string;
				template_name: string;
				parameters: object;
				agent_uuid?: string;
				conversation_id?: string;
				template_components?: unknown[];
			} = {
				to,
				template_name: templateName,
				parameters,
			};

			if (agent_uuid) {
				body.agent_uuid = agent_uuid;
			}
			if (conversation_id) {
				body.conversation_id = conversation_id;
			}
			if (template_components) {
				body.template_components = template_components;
			}

			try {
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