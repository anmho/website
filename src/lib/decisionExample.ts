export type DecisionExample = {
  decision: string;
  options: { label: string; messages: string[] }[];
};

export function parseDecisionExample(raw: string): DecisionExample | null {
  if (raw.length > 80000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const candidate = value as Partial<DecisionExample>;
    if (typeof candidate.decision !== 'string' || candidate.decision.length < 10 || candidate.decision.length > 4000) return null;
    if (!Array.isArray(candidate.options) || candidate.options.length < 2 || candidate.options.length > 8) return null;
    const labels = new Set<string>();
    for (const option of candidate.options) {
      if (!option || typeof option.label !== 'string' || !option.label.trim() || option.label.length > 200) return null;
      if (labels.has(option.label.trim())) return null;
      labels.add(option.label.trim());
      if (!Array.isArray(option.messages) || option.messages.length > 12) return null;
      if (option.messages.some((message) => typeof message !== 'string' || message.length > 4000)) return null;
      if (option.messages.join('').length > 8000) return null;
    }
    return {
      decision: candidate.decision,
      options: candidate.options.map(({ label, messages }) => ({ label: label.trim(), messages })),
    };
  } catch {
    return null;
  }
}
