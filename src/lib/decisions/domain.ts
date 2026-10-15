import { createHash } from 'node:crypto';

export class DecisionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export type ContextEntry = {
  text: string;
  kind: 'reported_fact' | 'verified_fact' | 'personal_assessment' | 'inference';
  source: { type: string; basis: string; url?: string };
  recorded_at: string;
  observed_at?: string;
  caveat?: string;
};
export type Option = { label: string; context: Record<string, ContextEntry> };
export type Decision = {
  title: string;
  question: string;
  state: string;
  constraints: string;
  context: Record<string, ContextEntry>;
  options: Record<string, Option>;
};
export const MAX_BYTES = 128_000;
export function id(value: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value)) throw new DecisionError(400, 'Invalid ID. Use 1 to 80 letters, digits, underscores or hyphens.');
  return value;
}
function object(value: unknown, keys?: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DecisionError(400, 'Expected a JSON object.');
  const result = value as Record<string, unknown>;
  if (keys && Object.keys(result).some(k => !keys.includes(k))) throw new DecisionError(400, 'Unknown field.');
  return result;
}
function text(value: unknown, max: number, optional = false): string {
  if (optional && value === undefined) return '';
  if (typeof value !== 'string' || (!optional && !value.trim()) || value.length > max) throw new DecisionError(400, `Expected text of at most ${max} characters.`);
  return value;
}
function date(value: unknown): string {
  const result = text(value, 40);
  if (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(result) || !Number.isFinite(Date.parse(result))) throw new DecisionError(400, 'Invalid date.');
  return result;
}
export function parseContext(value: unknown): ContextEntry {
  const v = object(value, ['text', 'kind', 'source', 'recorded_at', 'observed_at', 'caveat']);
  const kinds = ['reported_fact', 'verified_fact', 'personal_assessment', 'inference'];
  if (typeof v.kind !== 'string' || !kinds.includes(v.kind)) throw new DecisionError(400, 'Invalid context kind.');
  const source = object(v.source, ['type', 'basis', 'url']);
  const result: ContextEntry = {
    text: text(v.text, 8000), kind: v.kind as ContextEntry['kind'],
    source: { type: text(source.type, 100), basis: text(source.basis, 2000) },
    recorded_at: date(v.recorded_at),
  };
  if (source.url !== undefined) {
    const url = text(source.url, 2000);
    if (!/^https?:\/\//.test(url)) throw new DecisionError(400, 'Source URL must use HTTP or HTTPS.');
    result.source.url = url;
  }
  if (v.observed_at !== undefined) result.observed_at = date(v.observed_at);
  if (v.caveat !== undefined) result.caveat = text(v.caveat, 2000, true);
  return result;
}
function collection<T>(value: unknown, parse: (item: unknown) => T, max: number): Record<string, T> {
  const entries = Object.entries(object(value ?? {}));
  if (entries.length > max) throw new DecisionError(400, `Collection limit is ${max}.`);
  return Object.fromEntries(entries.map(([key, item]) => [id(key), parse(item)]));
}
export function parseOption(value: unknown): Option {
  const v = object(value, ['label', 'context']);
  return { label: text(v.label, 200), context: collection(v.context, parseContext, 100) };
}
export function parseDecision(value: unknown): Decision {
  const v = object(value, ['title', 'question', 'state', 'constraints', 'context', 'options']);
  const result: Decision = {
    title: text(v.title, 200), question: text(v.question, 4000),
    state: text(v.state, 8000, true), constraints: text(v.constraints, 8000, true),
    context: collection(v.context, parseContext, 100), options: collection(v.options, parseOption, 8),
  };
  if (Buffer.byteLength(JSON.stringify(result)) > MAX_BYTES) throw new DecisionError(413, 'Decision exceeds 128 KB.');
  return result;
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function inputHash(value: unknown): string { return createHash('sha256').update(canonical(value)).digest('hex'); }

export type Resource = { type: 'decision' } | { type: 'option'; optionId: string } | { type: 'context'; contextId: string; optionId?: string };
export function replaceResource(document: Decision, resource: Resource, value: unknown, remove = false): Decision {
  if (resource.type === 'decision') return parseDecision(value);
  const next = structuredClone(document);
  if (resource.type === 'option') {
    if (remove) delete next.options[resource.optionId];
    else Object.defineProperty(next.options, resource.optionId, { value: parseOption(value), enumerable: true, configurable: true, writable: true });
  } else {
    const context = resource.optionId ? (Object.hasOwn(next.options, resource.optionId) ? next.options[resource.optionId].context : undefined) : next.context;
    if (!context) throw new DecisionError(404, 'Option not found.');
    if (remove) delete context[resource.contextId];
    else Object.defineProperty(context, resource.contextId, { value: parseContext(value), enumerable: true, configurable: true, writable: true });
  }
  return parseDecision(next);
}
