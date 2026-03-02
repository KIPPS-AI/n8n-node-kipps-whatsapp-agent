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

const TEMPLATES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const templatesCache = new Map<string, { data: any[]; ts: number }>();

async function getTemplatesCached(
	cacheKey: string,
	fetch: () => Promise<any[]>,
): Promise<any[]> {
	const now = Date.now();
	const entry = templatesCache.get(cacheKey);
	if (entry && now - entry.ts < TEMPLATES_CACHE_TTL_MS) {
		return entry.data;
	}
	const data = await fetch();
	templatesCache.set(cacheKey, { data, ts: now });
	return data;
}

function getTemplatesCacheKey(creds: { organizationId?: string } | undefined): string {
	return creds?.organizationId ?? 'default';
}

export class KippsAiWhatsappAgent implements INodeType {

	methods = {
		loadOptions: {
			async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const creds = (await this.getCredentials('kippsAiApi')) as { organizationId?: string } | undefined;
				const cacheKey = getTemplatesCacheKey(creds);
				const templates = await getTemplatesCached(cacheKey, async () => {
					const res = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'kippsAiApi',
						{
							method: 'GET',
							url: 'https://backend.kipps.ai/integrations/get-whatsapp-templates/',
						},
					);
					return (res || []).filter((t: any) => t?.status === 'APPROVED');
				});

				return templates.map((t: any) => ({
					name: String(t.name),
					value: String(t.name),
				}));
			},

			async getTemplateComponentsPreview(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const templateName = this.getCurrentNodeParameter('templateName') as string;

				if (!templateName) {
					return [
						{
							name: 'Select a template above to see its components.',
							value: 'no_template',
						},
					];
				}

				let template: any;
				try {
					const creds = (await this.getCredentials('kippsAiApi')) as { organizationId?: string } | undefined;
					const cacheKey = getTemplatesCacheKey(creds);
					const templates = await getTemplatesCached(cacheKey, async () => {
						const res = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'kippsAiApi',
							{
								method: 'GET',
								url: 'https://backend.kipps.ai/integrations/get-whatsapp-templates/',
							},
						);
						return (res || []).filter((t: any) => t?.status === 'APPROVED');
					});
					template = templates.find((t: any) => String(t.name) === templateName);
				} catch {
					return [
						{
							name: 'The selected template could not be read. Please select it again.',
							value: 'invalid_template',
						},
					];
				}

				if (!template) {
					return [
						{
							name: 'The selected template could not be found. Please select it again.',
							value: 'template_not_found',
						},
					];
				}

				const components: any[] = Array.isArray(template.components) ? template.components : [];

				if (!components.length) {
					return [
						{
							name: 'This template has no components.',
							value: 'no_components',
						},
					];
				}

				const options: INodePropertyOptions[] = [];

				components.forEach((c, index) => {
					const type = c?.type ?? 'UNKNOWN';

					if (type === 'BODY') {
						const text: string = c.text ?? '';
						const short = text.length > 100 ? `${text.slice(0, 97)}…` : text;
						options.push({
							name: `${index + 1}. BODY – ${short || 'No body text'}`,
							value: `BODY_${index}`,
						});
					} else if (type === 'HEADER') {
						const format = c?.format ?? 'TEXT';
						const text: string = c.text ?? '';
						const short = text.length > 80 ? `${text.slice(0, 77)}…` : text;
						options.push({
							name: `${index + 1}. HEADER (${format})${short ? ` – ${short}` : ''}`,
							value: `HEADER_${index}`,
						});
					} else if (type === 'BUTTONS') {
						const buttons: any[] = Array.isArray(c.buttons) ? c.buttons : [];
						const labels = buttons
							.map((b: any) => b?.text)
							.filter((t: string | undefined): t is string => !!t)
							.join(', ');
						options.push({
							name: `${index + 1}. BUTTONS – ${labels || 'No button labels'}`,
							value: `BUTTONS_${index}`,
						});
					} else {
						options.push({
							name: `${index + 1}. ${type}`,
							value: `${type}_${index}`,
						});
					}
				});

				return options;
			},
		},
		resourceMapping: {
			async getTemplateFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
				const templateName = this.getCurrentNodeParameter('templateName') as string;
				if (!templateName) {
					return {
						fields: [],
					};
				}

				let template: any;
				try {
					const creds = (await this.getCredentials('kippsAiApi')) as { organizationId?: string } | undefined;
					const cacheKey = getTemplatesCacheKey(creds);
					const templates = await getTemplatesCached(cacheKey, async () => {
						const res = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'kippsAiApi',
							{
								method: 'GET',
								url: 'https://backend.kipps.ai/integrations/get-whatsapp-templates/',
							},
						);
						return (res || []).filter((t: any) => t?.status === 'APPROVED');
					});
					template = templates.find((t: any) => String(t.name) === templateName);
				} catch (error) {
					return { fields: [] };
				}

				if (!template) {
					return { fields: [] };
				}

				const body = template.components?.find((c: any) => c.type === 'BODY');
				if (!body) {
					return { fields: [] };
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
		icon : 'file:KippsAiWhatsappAgent.svg',
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
					reloadNodesOptions: true,
				},
				default: '',
			},
			
			{
				displayName: 'Template Components (preview)',
				name: 'templateComponentsPreview',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['templateName'],
					loadOptionsMethod: 'getTemplateComponentsPreview',
				},
				default: '',
				description:
				'Read-only preview of the selected template’s components (BODY, HEADER, BUTTONS, etc.). Open this after choosing a template to review what will be sent.',
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
				description:
					'Enter values for template parameters. Fields appear automatically after selecting a template above. If they do not appear, click the three-dots menu (⋮) and choose "Refresh fields".',
				typeOptions: {
					loadOptionsDependsOn: ['templateName'],
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

		const creds = (await this.getCredentials('kippsAiApi')) as { organizationId?: string } | undefined;
		const cacheKey = getTemplatesCacheKey(creds);
		let templates: any[];
		try {
			templates = await getTemplatesCached(cacheKey, async () => {
				const res = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'kippsAiApi',
					{
						method: 'GET',
						url: 'https://backend.kipps.ai/integrations/get-whatsapp-templates/',
					},
				);
				return (res || []).filter((t: any) => t?.status === 'APPROVED');
			});
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				'Could not load template details. Please try selecting the template again.',
			);
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {

			const to = this.getNodeParameter('to', itemIndex) as string;
			const templateName = this.getNodeParameter('templateName', itemIndex) as string;

			const template = templates.find((t: any) => String(t.name) === templateName);

			if (!template) {
				throw new NodeOperationError(
					this.getNode(),
					`Selected template "${templateName}" was not found. Please re-select a template.`,
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