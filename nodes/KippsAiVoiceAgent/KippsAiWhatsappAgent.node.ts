import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IHttpRequestMethods,
} from 'n8n-workflow';

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
				displayName: 'Phone Number',
				name: 'phoneNumber',
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
				default: '[]',
				required: true,
				description:
					'For {{name}} template → [{ "name": "industry", "value": "IT" }] \nFor {{1}} template → ["John", "Order123"]',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const phoneNumber = this.getNodeParameter('phoneNumber', itemIndex) as string;
			const templateName = this.getNodeParameter('templateName', itemIndex) as string;
			const parameters = this.getNodeParameter('parameters', itemIndex) as object;

			const endpoint = 'https://backend.kipps.ai/integrations/whatsapp-agent/send-template/';
			const method: IHttpRequestMethods = 'POST';

			const body = {
				to: phoneNumber,
				template_name: templateName,
				parameters: parameters,
			};

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