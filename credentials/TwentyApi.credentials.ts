import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TwentyApi implements ICredentialType {
	name = 'twentyApi';
	displayName = 'Twenty API';
	properties: INodeProperties[] = [
		{
			displayName: 'API key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			hint: 'Generate in Settings → API & Webhooks. Keys can be scoped to a role under Settings → Members → Roles → Assignment tab.',
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: '',
			hint: 'Your Twenty CRM base URL, e.g. https://yourworkspace.twenty.com',
		},
		{
			displayName: 'Schema Cache',
			name: 'schemaCache',
			type: 'hidden',
			default: '',
			description: 'Stores the API schema to reduce API calls. Will be updated automatically.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{"Bearer " + $credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.domain}}',
			url: '/open-api/core',
		},
	};
}
