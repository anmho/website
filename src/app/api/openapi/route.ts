import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Andrew Ho API',
    version: '1.0.0',
    description: 'Public Tenets and an admin-only Decisions API.',
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
        operationId: 'describePrivateDecisionsApi',
        summary: 'Describe the admin-only Decisions API',
        security: [{ adminSession: [] }],
        responses: {
          '200': { description: 'Private Decisions API metadata.' },
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
  },
  components: {
    securitySchemes: {
      adminSession: { type: 'apiKey', in: 'cookie', name: 'andrew_admin_session' },
    },
    schemas: {
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
