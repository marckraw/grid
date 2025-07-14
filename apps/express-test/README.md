# Express Grid Agent Test

Minimal Express.js application testing Grid's `createConfigurableAgent` in a traditional Node.js framework.

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
   cd apps/express-test
   pnpm dev
   ```

4. The server runs on port 3002

## Testing

Send a POST request to `http://localhost:3002/api/agent`:

```bash
curl -X POST http://localhost:3002/api/agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, Express agent!"}'
```

## Features

- Classic Express.js server
- Traditional Node.js runtime
- JSON body parsing with express.json()
- Direct Grid agent integration
- Runs on port 3002 (to avoid conflicts)