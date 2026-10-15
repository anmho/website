import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Andrew Ho Goals API',
    version: '1.0.0',
    description: 'An agent-friendly decision reflection API grounded in the public Tenets on Andrew Ho’s website.',
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
    '/api/goals': {
      get: {
        operationId: 'describeGoalsApi',
        summary: 'Describe the Goals API',
        responses: {
          '200': {
            description: 'Endpoint, changelog, age, and privacy metadata.',
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/GoalsApiDescription' },
              },
            },
          },
        },
      },
      post: {
        operationId: 'reflectOnGoal',
        summary: 'Reflect on a goal through the public Tenets',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/GoalRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Structured decision reflection.',
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/GoalReflectionResponse' },
              },
            },
          },
          '400': { description: 'Invalid goal or context.' },
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
      GoalRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['goal'],
        properties: {
          goal: { type: 'string', minLength: 10, maxLength: 4000 },
          context: { type: 'string', maxLength: 4000 },
        },
      },
      GoalReflectionResponse: {
        type: 'object',
        required: ['goal', 'model', 'tenets', 'reflection'],
        properties: {
          goal: { type: 'string' },
          model: { type: 'string' },
          tenets: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'title'],
              properties: { id: { type: 'string' }, title: { type: 'string' } },
            },
          },
          reflection: {
            type: 'object',
            required: ['recommendation', 'reasoning', 'alignedTenets', 'tensions', 'nextSteps', 'questions'],
            properties: {
              recommendation: { type: 'string' },
              reasoning: { type: 'string' },
              alignedTenets: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['title', 'reasoning'],
                  properties: { title: { type: 'string' }, reasoning: { type: 'string' } },
                },
              },
              tensions: { type: 'array', items: { type: 'string' } },
              nextSteps: { type: 'array', items: { type: 'string' } },
              questions: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      GoalJournalEntry: {
        type: 'object',
        required: ['id', 'date', 'kind', 'title', 'summary', 'age'],
        properties: {
          id: { type: 'string' },
          date: { type: 'string', format: 'date' },
          kind: { type: 'string', enum: ['goal', 'shift', 'reflection'] },
          title: { type: 'string' },
          summary: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          age: { type: ['integer', 'null'], minimum: 0 },
        },
      },
      GoalsApiDescription: {
        type: 'object',
        required: ['name', 'description', 'endpoints', 'changelog', 'age', 'openapi', 'privacy'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          endpoints: { type: 'object' },
          changelog: { type: 'array', items: { '$ref': '#/components/schemas/GoalJournalEntry' } },
          age: { type: 'object' },
          openapi: { type: 'string' },
          privacy: { type: 'string' },
        },
      },
      DecisionRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['decision', 'options'],
        properties: {
          decision: { type: 'string', minLength: 10, maxLength: 4000 },
          options: { type: 'array', minItems: 2, maxItems: 8, items: { type: 'string', maxLength: 200 } },
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
