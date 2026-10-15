import { NextResponse } from 'next/server';
import { getAllTenets } from '@/lib/tenets';
import { isAdminRequestAuthenticated } from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const model = process.env.OPENAI_DECISIONS_MODEL || 'gpt-6-luna';

type DecisionBody = {
  decision?: unknown;
  options?: unknown;
  state?: unknown;
  constraints?: unknown;
};

type ChoiceAnswer = {
  name?: unknown;
  type?: unknown;
  choice?: unknown;
  probabilities?: unknown;
  confidence?: unknown;
};

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isChoiceAnswer(value: unknown): value is ChoiceAnswer {
  if (!value || typeof value !== 'object') return false;
  const answer = value as ChoiceAnswer;
  return answer.type === 'choice' && typeof answer.choice === 'string';
}

function extractChoiceAnswer(value: unknown): ChoiceAnswer | null {
  if (!value || typeof value !== 'object') return null;
  const response = value as { answers?: unknown };
  if (!Array.isArray(response.answers)) return null;
  const answer = response.answers.find((item) => isChoiceAnswer(item));
  return answer ?? null;
}

function tenetContext(tenets: Awaited<ReturnType<typeof getAllTenets>>): string {
  return tenets
    .map((tenet) => `### ${tenet.title}\n${tenet.body || tenet.excerpt}`)
    .join('\n\n');
}

export async function GET(request: Request) {
  if (!isAdminRequestAuthenticated(request)) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

  return NextResponse.json({
    name: 'Private Decisions API',
    description: 'Choose among options using the complete, private Tenet set as a values lens.',
    endpoint: { method: 'POST', path: '/api/decisions' },
    model,
    privacy: 'The route is admin-only. Tenet bodies are sent to the configured OpenAI API provider only when a decision is submitted.',
  });
}

export async function POST(request: Request) {
  if (!isAdminRequestAuthenticated(request)) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as DecisionBody | null;
  const decision = asText(body?.decision);
  const state = asText(body?.state);
  const constraints = asText(body?.constraints);
  const options = Array.isArray(body?.options)
    ? body.options.filter((option): option is string => typeof option === 'string').map((option) => option.trim()).filter(Boolean)
    : [];
  const uniqueOptions = Array.from(new Set(options));

  if (decision.length < 10 || decision.length > 4000) {
    return NextResponse.json({ error: 'Decision must be between 10 and 4000 characters.' }, { status: 400 });
  }
  if (uniqueOptions.length < 2 || uniqueOptions.length > 8 || uniqueOptions.some((option) => option.length > 200)) {
    return NextResponse.json({ error: 'Provide 2 to 8 unique options, each 200 characters or fewer.' }, { status: 400 });
  }
  if (state.length > 4000 || constraints.length > 4000) {
    return NextResponse.json({ error: 'State and constraints must each be 4000 characters or fewer.' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'The decision model is not configured. Set OPENAI_API_KEY on the server.' }, { status: 503 });
  }

  const tenets = await getAllTenets();
  const input = [
    'Decision to make:',
    decision,
    '',
    'Options:',
    ...uniqueOptions.map((option, index) => `${index + 1}. ${option}`),
    state ? `\nCurrent state:\n${state}` : '',
    constraints ? `\nConstraints:\n${constraints}` : '',
    '',
    'Complete core Tenets, including private Tenets:',
    tenetContext(tenets),
  ].join('\n');

  const baseUrl = (process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  try {
    const response = await fetch(`${baseUrl}/decisions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input,
        questions: [{
          type: 'choice',
          name: 'choice',
          instructions: 'Which option best matches the person\'s complete Tenet set and current state? Return the option itself, not a number. Treat Tenets as a values lens, identify the most coherent choice, and account for tensions rather than inventing certainty.',
          choices: uniqueOptions.map((option) => ({ value: option, description: option })),
        }],
      }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json({ error: 'The Decisions API could not complete the choice.' }, { status: 502 });
    }

    const answer = extractChoiceAnswer(payload);
    if (!answer) {
      return NextResponse.json({ error: 'The Decisions API returned an invalid choice.' }, { status: 502 });
    }

    return NextResponse.json({
      decision,
      options: uniqueOptions,
      model,
      answer: {
        choice: answer.choice,
        probabilities: answer.probabilities ?? null,
        confidence: answer.confidence ?? null,
      },
      tenets: tenets.map(({ id, title, tags }) => ({ id, title, private: tags?.includes('private') ?? false })),
    });
  } catch {
    return NextResponse.json({ error: 'The Decisions API could not be reached.' }, { status: 502 });
  }
}
