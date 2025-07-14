# Hono.js Grid Agent Test

Minimal Hono.js application testing Grid's `createConfigurableAgent` in a modern web framework.

## Setup

1. Copy `.env.example` to `.env` and add your OpenAI API key:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies from the root of the monorepo:
   ```bash
   pnpm install
   ```

3. Run the development server:
   ```bash
   cd apps/hono-test
   pnpm dev
   ```

4. The server runs on port 3001

## Testing

Send a POST request to `http://localhost:3001/api/agent`:

```bash
curl -X POST http://localhost:3001/api/agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, Hono agent!"}'
```

## Features

- Lightweight Hono.js server
- Edge-runtime compatible
- Direct Grid agent integration
- Runs on port 3001 (to avoid conflicts)