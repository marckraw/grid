# Next.js Grid Agent Test

A minimal Next.js application demonstrating the use of Grid's `createConfigurableAgent` in API routes.

## Setup

1. Copy `.env.example` to `.env.local` and add your OpenAI API key:
   ```bash
   cp .env.example .env.local
   ```

2. Install dependencies from the root of the monorepo:
   ```bash
   pnpm install
   ```

3. Run the development server:
   ```bash
   cd apps/nextjs-test
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- Simple frontend with a text input to send prompts to the agent
- API route at `/api/agent` that uses `createConfigurableAgent` 
- Direct integration with Grid core primitives
- Real-time response display

## API Usage

The API endpoint accepts POST requests with a JSON body:

```json
{
  "prompt": "Your question or request here"
}
```

Response format:
```json
{
  "success": true,
  "response": "Agent's response text",
  "agent": "nextjs-test-agent"
}
```