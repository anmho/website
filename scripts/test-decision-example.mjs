import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/decisionExample.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { parseDecisionExample } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const example = { decision: 'Which option should I pursue?', options: [
  { label: 'Option A', messages: ['Source: a verified document.'] },
  { label: 'Option B', messages: ['User report: details remain unverified.'] },
] };
assert.deepEqual(parseDecisionExample(JSON.stringify(example)), example);
for (const bad of [null, {}, { ...example, decision: 'short' },
  { ...example, options: [example.options[0]] },
  { ...example, options: [example.options[0], { ...example.options[1], label: ' Option A ' }] },
  { ...example, options: [example.options[0], { label: 'B', messages: [null] }] },
  { ...example, options: [example.options[0], { label: 'B', messages: ['x'.repeat(4001)] }] },
  { ...example, options: [example.options[0], { label: 'B', messages: Array(13).fill('note') }] },
  { ...example, options: [example.options[0], { label: 'B', messages: Array(3).fill('x'.repeat(3000)) }] },
]) assert.equal(parseDecisionExample(JSON.stringify(bad)), null);
assert.equal(parseDecisionExample('{'), null);
assert.equal(parseDecisionExample('x'.repeat(80001)), null);
const page = readFileSync(new URL('../src/app/decisions/page.tsx', import.meta.url), 'utf8');
assert.ok(page.indexOf('await isAdminPageAuthenticated()') < page.indexOf('initialExample={await getDecisionExample()}'));
assert.ok(page.includes("dynamic = 'force-dynamic'"));
console.log('Decision example validation and auth-order checks passed.');
