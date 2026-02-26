import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
	INodePropertyOptions,
	ResourceMapperFields,
} from 'n8n-workflow';

import { NodeOperationError } from 'n8n-workflow';

export class KippsAiWhatsappAgent implements INodeType {

	methods = {
		loadOptions: {
			async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const res = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'kippsAiApi',
					{
						method: 'GET',
						url: 'https://backend.kipps.ai/integrations/get-whatsapp-templates/',
					},
				);

				return (res || [])
					.filter((t: any) => t?.status === 'APPROVED')
					.map((t: any) => ({
						name: String(t.name),
						value: JSON.stringify(t),
					}));
			},
		},
		resourceMapping: {
			async getTemplateFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
				const templateRaw = this.getCurrentNodeParameter('templateName') as string;
				if (!templateRaw) {
					return { fields: [] };
				}

				let template: any;
				try {
					template = JSON.parse(templateRaw);
				} catch {
					return { fields: [] };
				}

				const body = template.components?.find((c: any) => c.type === 'BODY');
				if (!body || !body.example) {
					return { fields: [] };
				}

				const fields: ResourceMapperFields['fields'] = [];

				// NAMED parameters
				if (template.parameter_format === 'NAMED') {
					const named = body.example.body_text_named_params || [];

					for (const p of named) {
						if (!p?.param_name) continue;
						fields.push({
							id: String(p.param_name),
							displayName: String(p.param_name),
							defaultMatch: false,
							canBeUsedToMatch: false,
							required: true,
							display: true,
							type: 'string',
						});
					}
				} else {
					// POSITIONAL parameters
					const examples: string[] = body.example.body_text?.[0] || [];

					examples.forEach((val: string, index: number) => {
						fields.push({
							id: `param_${index}`,
							displayName: `Parameter ${index + 1}`,
							defaultMatch: false,
							canBeUsedToMatch: false,
							required: true,
							display: true,
							type: 'string',
							defaultValue: val,
						});
					});
				}

				return { fields };
			},
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Kipps.AI WhatsApp',
		name: 'kippsAiWhatsapp',
		group: ['transform'],
		version: 1,
		description: 'Send WhatsApp template message using Kipps.AI with dynamic parameter fields',
		defaults: {
			name: 'Kipps.AI WhatsApp',
		},
		inputs: ['main'],
		outputs: ['main'],

		credentials: [{ name: 'kippsAiApi', required: true }],

		properties: [

			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				required: true,
				default: '',
			},

			{
				displayName: 'Template',
				name: 'templateName',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getTemplates',
				},
				default: '',
			},

		{
			displayName: 'Parameters',
			name: 'mappedParameters',
			type: 'resourceMapper',
			noDataExpression: true,
			default: {
				mappingMode: 'defineBelow',
				value: {},
			},
			required: true,
			description: 'Enter parameter values for the selected template. Fields are dynamically generated based on the template.',
			typeOptions: {
				resourceMapper: {
					mode: 'map',
					resourceMapperMethod: 'getTemplateFields',
				},
			},
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
			const templateRaw = this.getNodeParameter('templateName', itemIndex) as string;

			let template: any;
			try {
				template = JSON.parse(templateRaw);
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					`Invalid template data. Please select a template from the dropdown.`,
				);
			}

			const mapped = this.getNodeParameter('mappedParameters', itemIndex) as {
				value: Record<string, any>;
			};

			const values = mapped?.value || {};

			/* VALIDATION */
			const empty = Object.entries(values)
				.filter(([_, v]) => !v || v === '')
				.map(([k]) => k);

			if (empty.length) {
				throw new NodeOperationError(
					this.getNode(),
					`Required parameter fields are empty: ${empty.join(', ')}`,
				);
			}

			let parameters: any;

			if (template.parameter_format === 'NAMED') {
				// Convert to { body: [{ name, value }, ...] } format
				const body = template.components?.find((c: any) => c.type === 'BODY');
				const namedParams = body?.example?.body_text_named_params || [];

				parameters = {
					body: namedParams.map((p: any) => ({
						name: p.param_name,
						value: values[p.param_name] || '',
					})),
				};
			} else {
				// POSITIONAL: Convert to { body: ["val1", "val2", ...] } format
				parameters = {
					body: Object.keys(values)
						.sort((a, b) => {
							const aNum = Number(a.split('_')[1]);
							const bNum = Number(b.split('_')[1]);
							return aNum - bNum;
						})
						.map((k) => values[k]),
				};
			}

			const body: {
				to: string;
				template_name: string;
				template_components: any[];
				parameters: any;
				agent_uuid?: string;
				conversation_id?: string;
			} = {
				to,
				template_name: template.name,
				template_components: template.components || [],
				parameters,
			};

			const agent_uuid = this.getNodeParameter('agent_uuid', itemIndex, '') as string;
			const conversation_id = this.getNodeParameter('conversation_id', itemIndex, '') as string;

			if (agent_uuid) {
				body.agent_uuid = agent_uuid;
			}
			if (conversation_id) {
				body.conversation_id = conversation_id;
			}

			try {
				this.logger.debug('===== Kipps WhatsApp REQUEST =====');
				this.logger.debug(`Endpoint: https://backend.kipps.ai/integrations/whatsapp-agent/send-template/`);
				this.logger.debug(`Body: ${JSON.stringify(body)}`);

				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'kippsAiApi',
					{
						method: 'POST' as IHttpRequestMethods,
						url: 'https://backend.kipps.ai/integrations/whatsapp-agent/send-template/',
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
					err?.response?.data ? JSON.stringify(err.response.data) : err?.message || 'Unknown error',
				);
			}
		}

		return this.prepareOutputData(returnData);
	}
}