# Smooth Text Streaming in React + Next.js (OpenAI API)

OpenAI’s API supports **streaming responses** over server-sent events (SSE), so you can render tokens as they arrive instead of waiting for the full response. The OpenAI docs describe how to enable streaming and list the streaming event types you can listen for. This article shows a **UI pattern** for making streaming feel smooth in React + Next.js, including `requestAnimationFrame` batching and backpressure‑friendly rendering. OpenAI’s public docs focus on the API and streaming semantics, not frontend rendering details, so the React approach below is a proven, production-style technique that **aligns with OpenAI’s streaming API**, not a claim about OpenAI’s internal UI. ([OpenAI streaming guide](https://platform.openai.com/docs/guides/streaming-responses))

Sources:
- [OpenAI streaming guide](https://platform.openai.com/docs/guides/streaming-responses)
- [OpenAI safety checks (streaming can be delayed)](https://platform.openai.com/docs/guides/safety-checks)
- [Responses API streaming events](https://platform.openai.com/docs/api-reference/responses-streaming)

## What OpenAI Streaming Gives You

The OpenAI API can stream response events over SSE. You enable streaming by setting `stream=true` in the Responses API. The stream is delivered as **typed events** (e.g., `response.output_text.delta`) so your client can react to incremental text deltas. This is designed for streaming and is the recommended path for text streaming. ([OpenAI streaming guide](https://platform.openai.com/docs/guides/streaming-responses)) ([Responses API streaming events](https://platform.openai.com/docs/api-reference/responses-streaming))

Why it matters for UI:
1. You receive **small deltas** frequently.
2. If you render each delta directly, you can force too many React renders and janky UI.
3. A smooth UI batches deltas into a buffer and renders on the next animation frame.

## The Smooth Streaming Pattern (React + Next.js)

Key idea: **buffer fast, render slow**.

1. **Append deltas to a buffer** in a ref (no React state update per token).
2. **Schedule a render** with `requestAnimationFrame` (rAF).
3. On rAF, **flush the buffer** into state once per frame.

This keeps the UI near 60fps even when tokens arrive faster than the render loop.

### Pseudocode sketch

```tsx
// client component
const [text, setText] = useState('');
const bufferRef = useRef('');
const rafRef = useRef<number | null>(null);

function enqueueDelta(delta: string) {
  bufferRef.current += delta;
  if (rafRef.current == null) {
    rafRef.current = requestAnimationFrame(() => {
      setText((prev) => prev + bufferRef.current);
      bufferRef.current = '';
      rafRef.current = null;
    });
  }
}
```

### Why rAF helps
- rAF runs before the browser paints, so you **align state updates with the render loop**.
- You collapse many token events into a single React render per frame.
- The UI remains responsive even for high‑throughput streams.

## Next.js Integration Notes

1. **Server route streams, client renders**
   - Use an API route to connect to OpenAI and stream SSE events to the browser.
   - On the client, parse and forward deltas to `enqueueDelta`.

2. **Guard against delayed streaming**
   - OpenAI may delay streaming for safety checks. The docs recommend showing a spinner if streaming is delayed. ([Safety checks](https://platform.openai.com/docs/guides/safety-checks))

3. **Avoid heavy re-renders**
   - Keep the streaming text in a single text node.
   - Avoid re-rendering large component trees on each update.

## Gotchas That Cause Jank

- Updating React state **per token**.
- Syntax highlighting on every delta (defer until completion).
- Frequent layout changes (e.g., expanding containers on each chunk).

## Summary

- OpenAI’s API streams over SSE with typed events.
- A smooth UI batches deltas and renders on `requestAnimationFrame`.
- This approach is **client-side** and works in Next.js while respecting OpenAI’s streaming semantics.

If you want, I can add a full Next.js SSE example (route handler + client hook) tailored to your repo’s setup.
