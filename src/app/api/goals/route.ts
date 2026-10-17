import { NextResponse } from 'next/server';
import { isAdminRequestAuthenticated } from '@/lib/adminAuth';
import { getGoalChangelog } from '@/lib/goals';
import { getAllTenets, type PublicTenet } from '@/lib/tenets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const model = process.env.OPENAI_GOALS_MODEL || 'gpt-6-luna';
const openAiBaseUrl = (process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

const goalReflectionSchema = {
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
} as const;

type GoalReflection = {
  recommendation: string;
  reasoning: string;
  alignedTenets: Array<{ title: string; reasoning: string }>;
  tensions: string[];
  nextSteps: string[];
  questions: string[];
};

function tenetContext(tenets: PublicTenet[]) {
  return tenets
    .map((tenet) => `### ${tenet.title}\n${tenet.body || tenet.excerpt}`)
    .join('\n\n');
}

function getOutputText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';

  const response = payload as {
    output_text?: unknown;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: unknown }>;
    }>;
  };

  if (typeof response.output_text === 'string') return response.output_text;

  return (response.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === 'output_text' && typeof content.text === 'string')
    .map((content) => content.text as string)
    .join('');
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

export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

  const changelog = await getGoalChangelog();

  return NextResponse.json({
    name: 'Private goals decision API',
    description: 'Evaluate a goal against Andrew Ho’s complete Tenet set.',
    endpoints: {
      tenets: {
        method: 'GET',
        path: '/api/tenets',
        description: 'Returns the Tenets available to the private decision model.',
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
    privacy: 'This route requires Cloudflare Access. The complete Tenet set is sent to the configured model provider only when a reflection is requested, with storage disabled when supported.',
  });
}

export async function POST(request: Request) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

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

  const tenets = await getAllTenets();
  const prompt = [
    'Complete core Tenets, including private Tenets:',
    tenetContext(tenets),
    '',
    'User goal:',
    goal,
    context ? `\nAdditional context:\n${context}` : '',
  ].join('\n');

  const modelResponse = await fetch(`${openAiBaseUrl}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      store: false,
      instructions:
        'You are a careful private decision coach. Use the complete Tenet set as a values lens, not as absolute rules. Do not make the decision for the user. Identify alignment, tensions, tradeoffs, and practical next steps. Be direct, specific, and humane. If the goal involves medical, legal, financial, or immediate safety risk, say that professional help may be appropriate. Return only the requested JSON object.',
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'goal_reflection',
          strict: true,
          schema: goalReflectionSchema,
        },
      },
    }),
  });

  if (!modelResponse.ok) {
    return NextResponse.json(
      { error: 'The decision model could not complete the reflection.' },
      { status: 502 }
    );
  }

  const payload = await modelResponse.json() as unknown;
  const outputText = getOutputText(payload);
  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText) as unknown;
  } catch {
    return NextResponse.json(
      { error: 'The decision model returned invalid JSON.' },
      { status: 502 }
    );
  }

  if (!isGoalReflection(parsed)) {
    return NextResponse.json(
      { error: 'The decision model returned an invalid reflection.' },
      { status: 502 }
    );
  }

  return NextResponse.json({
    goal,
    model,
    tenets: tenets.map(({ id, title }) => ({ id, title })),
    reflection: parsed,
  });
}
