# websitectl

TypeScript CLI (Commander) for the website admin API.

## Install

```bash
npm install -g websitectl
```

For local testing in this repo:

```bash
npm --prefix tools/websitectl-ts run install:global
```

## Setup

```bash
websitectl setup
```

This stores config at:

`~/.config/websitectl/config.json`

You can also override per command:

- `--base-url http://localhost:3000`
- `--api-key <ADMIN_API_KEY>`

Or via env vars:

- `WEBSITECTL_BASE_URL`
- `WEBSITECTL_API_KEY`

## Commands

```bash
websitectl bookmark add <url>

websitectl api validate
websitectl api new-learning --question "..." --answer "..." --tags "tag1,tag2"
websitectl api new-article --title "..." --excerpt "..."
```

## Publish

```bash
npm --prefix tools/websitectl-ts run publish:npm
```

## Development

```bash
npm --prefix tools/websitectl-ts install
npm --prefix tools/websitectl-ts run build
npm --prefix tools/websitectl-ts run dev -- --help
```
