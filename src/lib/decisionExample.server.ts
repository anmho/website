import 'server-only';
import { parseDecisionExample } from './decisionExample';

// Call only after admin authentication. Never use a NEXT_PUBLIC variable here.
export function getDecisionExample() {
  const raw = process.env.DECISIONS_EXAMPLE_JSON;
  return raw ? parseDecisionExample(raw) : null;
}
