import 'server-only';
import { parseDecisionExample } from './decisionExample';
import { readDecisionsSecret } from './decisionsVault.server';

// Call only after admin authentication. Never use a NEXT_PUBLIC variable here.
export async function getDecisionExample() {
  const raw = process.env.DECISIONS_EXAMPLE_JSON ?? (await readDecisionsSecret('decisions-example'))?.example_json;
  return typeof raw === 'string' ? parseDecisionExample(raw) : null;
}
