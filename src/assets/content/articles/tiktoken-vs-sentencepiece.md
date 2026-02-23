# Tiktoken vs SentencePiece: Methodology, BPE, and When to Use Each

This article explains the methodological differences between **tiktoken** and **SentencePiece**, how **BPE** fits in, and which model families typically use each. It includes high‑level pseudocode and small illustrative snippets for the critical steps.

## Quick Summary

- **tiktoken** is a fast **BPE** tokenizer for use with OpenAI models. ([tiktoken GitHub](https://github.com/openai/tiktoken))
- **SentencePiece** supports **BPE** and **Unigram** and can train directly from raw text without pre‑tokenization. ([SentencePiece GitHub](https://github.com/google/sentencepiece))

## The Core Methodological Difference

### 1) Pre‑tokenization & text normalization

**tiktoken** (GPT‑style byte BPE):
- Operates on **bytes** (0–255) to avoid Unicode edge cases.
- Optimized for speed and batch throughput.

**SentencePiece**:
- Trains directly from raw sentences without language‑specific pre‑tokenization.
- Supports multiple subword algorithms (BPE, Unigram).

**Implication**: tiktoken is very fast for inference with fixed vocab and byte BPE. SentencePiece is flexible for training new models and supports multiple tokenization strategies and normalization.

## BPE in One Paragraph

**Byte Pair Encoding (BPE)** starts with a base vocabulary (bytes or characters) and repeatedly merges the **most frequent adjacent pair** into a new token. This builds a subword vocabulary that balances compression with generalization. 

### BPE high‑level pseudocode

```text
vocab = base_symbols(text)  # bytes or characters
for step in range(num_merges):
    pair = most_frequent_adjacent_pair(text, vocab)
    vocab.add(pair)
    text = merge_pair_in_corpus(text, pair)
```

## tiktoken: How It Works

### Key properties
- **Byte‑level BPE** (same family as GPT‑2/3/4).
- Uses a **regex** to split text into chunks, then applies BPE merges over byte sequences.
- The merge table and vocabulary are fixed per model.

### High‑level pseudocode (tiktoken‑style)

```text
chunks = regex_split(text)
for chunk in chunks:
    bytes = utf8_bytes(chunk)
    tokens += byte_bpe_encode(bytes, merges, vocab)
```

### Critical step: byte BPE merge loop (illustrative)

```text
while exists_merge(pair):
    pair = best_merge_pair(sequence)
    sequence = merge(sequence, pair)
```

## SentencePiece: How It Works

SentencePiece supports two main algorithms; the most common are **BPE** and **Unigram**.

### High‑level pseudocode (SentencePiece BPE)

```text
text = normalize(text)
# SentencePiece treats whitespace as a normal symbol (e.g., ▁)
text = replace_space_with_marker(text)

tokens = bpe_encode(text, merges, vocab)
```

### High‑level pseudocode (SentencePiece Unigram)

```text
text = normalize(text)
text = replace_space_with_marker(text)

lattice = build_all_subword_segmentations(text, vocab)
score = best_path(lattice, unigram_probs)
return tokens_from_path(score)
```

## Model Context: Who Uses What?

- **OpenAI GPT models**: use **tiktoken** encodings (byte BPE). ([tiktoken GitHub](https://github.com/openai/tiktoken))
- **T5 family**: uses a **SentencePiece** tokenizer. ([torchtext T5 docs](https://docs.pytorch.org/text/0.17.0/tutorials/t5_demo.html))
- **LLaMA family**: uses a **SentencePiece** tokenizer. ([Keras LlamaTokenizer docs](https://keras.io/keras_hub/api/models/llama/llama_tokenizer/))

The specific tokenizer is chosen during model training and is tightly coupled to the model’s vocabulary. 

## When to Use Which

**Use tiktoken when**:
- You need compatibility with OpenAI GPT encodings.
- You need high throughput tokenization for known OpenAI models.

**Use SentencePiece when**:
- You are training a new model or need to customize tokenization rules.
- You need Unigram or custom normalization.
- You want a tool that supports multiple subword algorithms.

## References

- [tiktoken GitHub](https://github.com/openai/tiktoken)
- [SentencePiece GitHub](https://github.com/google/sentencepiece)
- [torchtext T5 docs (SentencePiece)](https://docs.pytorch.org/text/0.17.0/tutorials/t5_demo.html)
- [Keras LlamaTokenizer docs (SentencePiece)](https://keras.io/keras_hub/api/models/llama/llama_tokenizer/)
