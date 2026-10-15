import 'server-only';
import { verifyCloudflareAccessHeaders } from '../cloudflareAccess';
import { getAllTenets } from '../tenets';
import { readStaticMarkdown } from '../staticContent';
import watch from '@/assets/static/json/watch.json';
import { getDecisionsApiKey } from '../decisionsVault.server';
import { decisionPool } from './database';
import { DecisionStore } from './store';
import { createDecisionHandler } from './http';

export const handleDecisionRequest = createDecisionHandler({
  authenticate: async request => {
    const result = await verifyCloudflareAccessHeaders(request.headers);
    const allowed = (process.env.CLOUDFLARE_ACCESS_ALLOWED_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    // An explicit human identity is required; no shared anonymous admin owner.
    return result.authenticated && result.email && allowed.includes(result.email) ? result.email : null;
  },
  store: async () => new DecisionStore(await decisionPool()),
  values: async () => ({
    tenets: (await getAllTenets()).sort((a, b) => a.id.localeCompare(b.id)),
    media: await Promise.all([...watch].sort((a, b) => a.id.localeCompare(b.id)).map(async item => ({ ...item, body: await readStaticMarkdown('watch', item.id) }))),
    readings: [{ id: 'die-with-zero', body: await readStaticMarkdown('readings', 'die-with-zero') }],
  }),
  key: getDecisionsApiKey,
  model: () => process.env.OPENAI_DECISIONS_MODEL || 'gpt-6-luna',
  dailyLimit: () => {
    const value = Number(process.env.DECISIONS_DAILY_LIMIT || 10);
    return Number.isInteger(value) && value > 0 && value <= 100 ? value : 10;
  },
});
