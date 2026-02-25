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
	icon = 'file:../nodes/KippsWhatsappAgent/whatsapp.svg' as Icon;

	documentationUrl = 'https://docs.kipps.ai/docs/v1.2.2/developer-api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			placeholder: 'Enter your Kipps API Key',
			description: 'API key from Kipps.AI dashboard',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Api-Key {{$credentials.apiKey}}',
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