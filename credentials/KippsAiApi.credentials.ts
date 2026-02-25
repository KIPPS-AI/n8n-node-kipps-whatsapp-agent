import {
	ICredentialType,
	INodeProperties,
	IAuthenticateGeneric,
	ICredentialTestRequest,
} from 'n8n-workflow';
import type { Icon } from 'n8n-workflow';

export class KippsAiApi implements ICredentialType {
	name = 'kippsAiApi';
	displayName = 'Kipps.AI API';

	// change icon to whatsapp-related node icon if you have one
	icon = 'file:../nodes/KippsAiWhatsappAgent/whatsapp.svg' as Icon;

	documentationUrl = 'https://docs.kipps.ai/docs/v1.2.2/developer-api';

	properties: INodeProperties[] = [
		{
			displayName: 'Bearer Token',
			name: 'bearerToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: 'Enter your Bearer token',
			description: 'Bearer token from Kipps.AI dashboard',
		},
		{
			displayName: 'Organization ID',
			name: 'organizationId',
			type: 'string',
			default: '',
			placeholder: 'bb51f8ad-4ee8-40cf-98aa-64b9c4b3eae9',
			description: 'Organization UUID from Kipps.AI dashboard',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.bearerToken}}',
				'X-Organization-ID': '={{$credentials.organizationId}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			// use a real working endpoint for validation
			url: 'https://backend.kipps.ai/test/',
		},
	};
}