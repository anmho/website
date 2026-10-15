import { NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, jsonSchema, Output } from 'ai';
import { getGoalChangelog } from '@/lib/goals';
import { getPublicTenets, type PublicTenet } from '@/lib/tenets';

export const runtime = 'nodejs';

const model = process.env.OPENAI_GOALS_MODEL || 'gpt-6-luna';

const goalReflectionSchema: Parameters<typeof jsonSchema>[0] = {
  type: 'object',
  additionalProperties: false,
  properties: {
    recommendation: { type: 'string' },
    reasoning: { type: 'string' },
    alignedTenets: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          reasoning: { type: 'string' },
        },
        required: ['title', 'reasoning'],
      },
    },
    tensions: {
      type: 'array',
      items: { type: 'string' },
    },
    nextSteps: {
      type: 'array',
      items: { type: 'string' },
    },
    questions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['recommendation', 'reasoning', 'alignedTenets', 'tensions', 'nextSteps', 'questions'],
};

type GoalReflection = {
  recommendation: string;
  reasoning: string;
  alignedTenets: Array<{ title: string; reasoning: string }>;
  tensions: string[];
  nextSteps: string[];
  questions: string[];
};

function publicTenetContext(tenets: PublicTenet[]) {
  return tenets
    .map((tenet) => `### ${tenet.title}\n${tenet.body || tenet.excerpt}`)
    .join('\n\n');
}

function isGoalReflection(value: unknown): value is GoalReflection {
  if (!value || typeof value !== 'object') return false;

  const reflection = value as Partial<GoalReflection>;
  return (
    typeof reflection.recommendation === 'string' &&
    typeof reflection.reasoning === 'string' &&
    Array.isArray(reflection.alignedTenets) &&
    Array.isArray(reflection.tensions) &&
    Array.isArray(reflection.nextSteps) &&
    Array.isArray(reflection.questions)
  );
}

export async function GET() {
  const changelog = await getGoalChangelog();

  return NextResponse.json({
    name: 'Goals decision API',
    description: 'Evaluate a goal against Andrew Ho’s public Tenets.',
    endpoints: {
      tenets: {
        method: 'GET',
        path: '/api/tenets',
        description: 'Returns the public Tenets available to the decision model.',
      },
      reflect: {
        method: 'POST',
        path: '/api/goals',
        body: {
          goal: 'string, required, 10 to 4000 characters',
          context: 'string, optional, up to 4000 characters',
        },
      },
    },
    openapi: '/api/openapi',
    changelog,
    age: {
      configured: Boolean(process.env.BIRTH_DATE),
      field: 'changelog[].age',
      privacy: 'Age is derived server-side. The birthday is never returned.',
    },
    privacy: 'Tenets tagged private are excluded before the model prompt is built. Goals are sent to the configured model provider with storage disabled when supported.',
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { goal?: unknown; context?: unknown } | null;
  const goal = typeof body?.goal === 'string' ? body.goal.trim() : '';
  const context = typeof body?.context === 'string' ? body.context.trim() : '';

  if (goal.length < 10 || goal.length > 4000) {
    return NextResponse.json(
      { error: 'Goal must be between 10 and 4000 characters.' },
      { status: 400 }
    );
  }

  if (context.length > 4000) {
    return NextResponse.json(
      { error: 'Context must be 4000 characters or fewer.' },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'The decision model is not configured. Set OPENAI_API_KEY on the server.' },
      { status: 503 }
    );
  }

  const tenets = await getPublicTenets();
  const prompt = [
    'Public core Tenets:',
    publicTenetContext(tenets),
    '',
    'User goal:',
    goal,
    context ? `\nAdditional context:\n${context}` : '',
  ].join('\n');

  try {
    const openai = createOpenAI({
      apiKey,
      baseURL: process.env.OPENAI_API_BASE_URL,
    });
    const { output } = await generateText({
      model: openai.responses(model),
      system:
        'You are a careful decision coach. Use the public Tenets as a values lens, not as absolute rules. Do not make the decision for the user. Identify alignment, tensions, tradeoffs, and practical next steps. Be direct, specific, and humane. If the goal involves medical, legal, financial, or immediate safety risk, say that professional help may be appropriate.',
      prompt,
      output: Output.object({
        name: 'goal_reflection',
        schema: jsonSchema<GoalReflection>(goalReflectionSchema),
      }),
      providerOptions: {
        openai: {
          store: false,
        },
      },
      maxRetries: 0,
    });

    if (!isGoalReflection(output)) {
      return NextResponse.json(
        { error: 'The decision model returned an invalid reflection.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      goal,
      model,
      tenets: tenets.map(({ id, title }) => ({ id, title })),
      reflection: output,
    });
  } catch {
    return NextResponse.json(
      { error: 'The decision model could not complete the reflection.' },
      { status: 502 }
    );
  }
}
