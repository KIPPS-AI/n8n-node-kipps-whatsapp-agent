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
					return { 
						fields: [],
						emptyFieldsNotice: '👆 Select a template above to see parameter fields here.and wait for some seconds',
					};
				}

				let template: any;
				try {
					template = JSON.parse(templateRaw);
				} catch (error) {
					return { fields: [] };
				}

				const body = template.components?.find((c: any) => c.type === 'BODY');
				if (!body) {
					return { 
						fields: [],
						emptyFieldsNotice: 'This template has no message body with parameters.',
					};
				}

				const fields: ResourceMapperFields['fields'] = [];

				// NAMED parameters
				if (template.parameter_format === 'NAMED') {
					const named = body.example?.body_text_named_params || [];

					for (const p of named) {
						if (!p?.param_name) continue;
						const exampleHint = p.example ? ` (e.g., "${p.example}")` : '';
						fields.push({
							id: String(p.param_name),
							displayName: `${p.param_name}${exampleHint}`,
							defaultMatch: false,
							canBeUsedToMatch: false,
							required: true,
							display: true,
							type: 'string',
							defaultValue: p.example || '',
						});
					}
				} else {
					// POSITIONAL parameters
					// Try to get count from example first
					let paramCount = 0;
					const examples: string[] = body.example?.body_text?.[0] || [];
					
					if (examples.length > 0) {
						// Use example count
						paramCount = examples.length;
					} else {
						// Fallback: Count placeholders in BODY text ({{1}}, {{2}}, etc.)
						const bodyText = body.text || '';
						const placeholderMatches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
						
						if (placeholderMatches.length > 0) {
							const numbers = placeholderMatches.map((m: string) => {
								const match = m.match(/\d+/);
								return match ? parseInt(match[0]) : 0;
							});
							paramCount = Math.max(...numbers);
						} else {
							paramCount = 0;
						}
					}

					// Generate fields based on count
					for (let index = 0; index < paramCount; index++) {
						const exampleVal = examples[index] || '';
						const displayName = exampleVal 
							? `Parameter ${index + 1} (e.g., "${exampleVal}")`
							: `Parameter ${index + 1}`;
						fields.push({
							id: `param_${index}`,
							displayName,
							defaultMatch: false,
							canBeUsedToMatch: false,
							required: true,
							display: true,
							type: 'string',
							defaultValue: exampleVal,
						});
					}
				}

				if (fields.length === 0) {
					return {
						fields: [],
						emptyFieldsNotice: '✅ This template has no parameters to fill. The message will be sent as-is.',
					};
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
			description: 'Enter values for template parameters. Fields appear automatically after selecting a template above.',
			typeOptions: {
				resourceMapper: {
					mode: 'map',
					resourceMapperMethod: 'getTemplateFields',
					supportAutoMap: false,
					hideNoDataError: true,
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

				returnData.push({
					json: response,
					pairedItem: itemIndex,
				});
			} catch (error: unknown) {
				const err = error as {
					message?: string;
					response?: { data?: unknown };
				};

				throw new NodeOperationError(
					this.getNode(),
					err?.response?.data ? JSON.stringify(err.response.data) : err?.message || 'Unknown error',
				);
			}
		}

		return this.prepareOutputData(returnData);
	}
}