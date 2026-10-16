import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const canvasResources = [
  ['/api/decisions/{decisionId}', 'DecisionDocument'],
  ['/api/decisions/{decisionId}/options/{optionId}', 'DecisionOption'],
  ['/api/decisions/{decisionId}/context/{contextId}', 'DecisionContext'],
  ['/api/decisions/{decisionId}/options/{optionId}/context/{contextId}', 'DecisionContext'],
] as const;
const pathParameters = (path: string) => Array.from(path.matchAll(/\{(\w+)\}/g)).map(match => ({ name: match[1], in: 'path', required: true, schema: { type: 'string' } }));
const canvasPaths = Object.fromEntries(canvasResources.map(([path, schema]) => [path, {
  parameters: pathParameters(path),
  ...Object.fromEntries(['get', 'put', 'delete'].map(method => [method, {
    summary: `${method.toUpperCase()} private ${schema}`,
    security: [{ adminSession: [] }],
    ...(method === 'put' ? { requestBody: { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } } } } : {}),
    ...(method !== 'get' ? { parameters: [{ name: 'If-Match', in: 'header', schema: { type: 'string' }, description: 'Optional quoted decision revision, for example "3".' }] } : {}),
    responses: { '200': { description: method === 'get' ? 'Requested resource; decision GET includes document and revision.' : 'Updated decision, or null after deleting a decision.' }, '400': { description: 'Invalid input.' }, '401': { description: 'Verified allowlisted Cloudflare identity required.' }, '404': { description: 'Not found for this owner.' }, '409': { description: 'Revision conflict.' }, '413': { description: 'Decision exceeds size limit.' } },
  }])),
}]));

const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Andrew Ho APIs',
    version: '1.0.0',
    description: 'Agent-facing APIs grounded in Andrew Ho’s public and private tools.',
  },
  paths: {
    '/api/tenets': {
      get: {
        operationId: 'listPublicTenets',
        summary: 'List public Tenets',
        responses: {
          '200': {
            description: 'Public Tenets available to the decision model.',
          },
        },
      },
    },
    '/api/perspective': {
      get: {
        operationId: 'describePersonalPerspectiveApi',
        summary: 'Describe the personal perspective API',
        responses: {
          '200': { description: 'Perspective API metadata.' },
        },
      },
      post: {
        operationId: 'answerFromPersonalPerspective',
        summary: 'Answer a question through Andrew Ho’s public values and writings',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/PerspectiveRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'A first-person reflection grounded in public sources.',
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/PerspectiveResponse' },
              },
            },
          },
          '400': { description: 'Invalid question or context.' },
          '502': { description: 'Model provider failure.' },
          '503': { description: 'Model provider is not configured.' },
        },
      },
    },
    '/api/decisions': {
      get: {
        operationId: 'listPrivateDecisions',
        summary: 'List the authenticated owner’s persisted decisions',
        security: [{ adminSession: [] }],
        responses: {
          '200': { description: 'Up to 200 decision summaries.' },
          '401': { description: 'Admin authentication required.' },
        },
      },
      post: {
        operationId: 'chooseWithPrivateTenets',
        summary: 'Choose among options using the complete Tenet set',
        security: [{ adminSession: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/DecisionRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Choice and provider probabilities.',
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/DecisionResponse' },
              },
            },
          },
          '401': { description: 'Admin authentication required.' },
          '400': { description: 'Invalid decision or options.' },
          '503': { description: 'Model provider is not configured.' },
        },
      },
    },
    ...canvasPaths,
    ...Object.fromEntries([
      '/api/decisions/{decisionId}/options',
      '/api/decisions/{decisionId}/context',
      '/api/decisions/{decisionId}/options/{optionId}/context',
      '/api/decisions/{decisionId}/evaluations',
      '/api/decisions/{decisionId}/evaluations/{evaluationId}',
    ].map(path => [path, { parameters: pathParameters(path), get: { summary: 'Read private decision data without a model call', security: [{ adminSession: [] }], responses: { '200': { description: 'Requested collection or evaluation snapshot.' }, '401': { description: 'Authentication required.' }, '404': { description: 'Not found.' } } } }])),
    '/api/decisions/{decisionId}/evaluate': {
      parameters: pathParameters('/api/decisions/{decisionId}/evaluate'),
      post: {
        summary: 'Return a cached evaluation or claim and run one model call', security: [{ adminSession: [] }],
        responses: { '200': { description: 'Completed or failed evaluation; inspect status.' }, '202': { description: 'Existing pending evaluation; not resubmitted.' }, '401': { description: 'Authentication required.' }, '429': { description: 'Daily new-evaluation limit reached.' }, '503': { description: 'Configuration unavailable.' } },
      },
    },
  },
  components: {
    securitySchemes: {
      adminSession: { type: 'apiKey', in: 'header', name: 'Cf-Access-Jwt-Assertion', description: 'Verified Cloudflare Access JWT. Canvas endpoints additionally require an explicitly allowlisted email.' },
    },
    schemas: {
      DecisionDocument: {
        type: 'object', additionalProperties: false, required: ['title', 'question'],
        properties: {
          title: { type: 'string', maxLength: 200 }, question: { type: 'string', maxLength: 4000 },
          state: { type: 'string', maxLength: 8000 }, constraints: { type: 'string', maxLength: 8000 },
          context: { type: 'object', additionalProperties: { $ref: '#/components/schemas/DecisionContext' } },
          options: { type: 'object', maxProperties: 8, additionalProperties: { $ref: '#/components/schemas/DecisionOption' } },
        },
      },
      DecisionOption: {
        type: 'object', additionalProperties: false, required: ['label'],
        properties: { label: { type: 'string', maxLength: 200 }, context: { type: 'object', maxProperties: 100, additionalProperties: { $ref: '#/components/schemas/DecisionContext' } } },
      },
      DecisionContext: {
        type: 'object', additionalProperties: false, required: ['text', 'kind', 'source', 'recorded_at'],
        properties: {
          text: { type: 'string', maxLength: 8000 }, kind: { enum: ['reported_fact', 'verified_fact', 'personal_assessment', 'inference'] },
          source: { type: 'object', additionalProperties: false, required: ['type', 'basis'], properties: { type: { type: 'string' }, basis: { type: 'string' }, url: { type: 'string', format: 'uri' } } },
          recorded_at: { type: 'string' }, observed_at: { type: 'string' }, caveat: { type: 'string', maxLength: 2000 },
        },
      },
      PerspectiveRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['question'],
        properties: {
          question: { type: 'string', minLength: 3, maxLength: 4000 },
          context: { type: 'string', maxLength: 4000 },
        },
      },
      PerspectiveResponse: {
        type: 'object',
        required: ['question', 'model', 'answer', 'sources'],
        properties: {
          question: { type: 'string' },
          model: { type: 'string' },
          answer: {
            type: 'object',
            required: ['answer', 'stance', 'reasoning', 'tensions', 'nextSteps'],
            properties: {
              answer: { type: 'string' },
              stance: { type: 'string', enum: ['direct', 'mixed', 'unclear'] },
              reasoning: { type: 'string' },
              tensions: { type: 'array', items: { type: 'string' } },
              nextSteps: { type: 'array', items: { type: 'string' } },
            },
          },
          sources: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'title', 'type', 'path', 'excerpt'],
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                type: { type: 'string' },
                path: { type: 'string' },
                excerpt: { type: 'string' },
              },
            },
          },
        },
      },
      DecisionRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['decision', 'options'],
        properties: {
          decision: { type: 'string', minLength: 10, maxLength: 4000 },
          options: {
            type: 'array',
            minItems: 2,
            maxItems: 8,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['value'],
              properties: {
                value: { type: 'string', maxLength: 200 },
                context: { type: 'array', maxItems: 12, items: { type: 'string', maxLength: 4000 } },
              },
            },
          },
          state: { type: 'string', maxLength: 4000 },
          constraints: { type: 'string', maxLength: 4000 },
        },
      },
      DecisionResponse: {
        type: 'object',
        required: ['decision', 'options', 'model', 'answer', 'tenets'],
        properties: {
          decision: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          model: { type: 'string' },
          answer: {
            type: 'object',
            required: ['choice', 'probabilities', 'confidence'],
            properties: {
              choice: { type: 'string' },
              probabilities: {},
              confidence: {},
            },
          },
          tenets: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'title', 'private'],
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                private: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  },
};

export function GET() {
  return NextResponse.json(openapi);
}
