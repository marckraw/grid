# OpenRouter Support Implementation

## Problem Identified

The grid-core `base.llm.service.ts` only supported two providers:

1. OpenAI (default)
2. Anthropic (when `provider === "anthropic"`)

When `provider: "openrouter"` was passed, it would default to using the OpenAI SDK with OpenAI's API endpoint, causing errors when trying to use non-OpenAI models like Google Gemini.

## Error Example

```
AI_APICallError: Invalid parameter: 'text.format' of type 'json_schema' is not supported with model version `google/gemini-2.5-flash`.
url: "https://api.openai.com/v1/responses"  ← Wrong endpoint!
```

The code was calling OpenAI's API instead of OpenRouter's API.

## Solution

Added OpenRouter support to the grid-core LLM service by:

1. **Installing official OpenRouter provider** `@openrouter/ai-sdk-provider`
2. **Importing `createOpenRouter`** from the official provider package
3. **Adding OpenRouter branch** in the provider selection logic
4. **Using `openrouter.chat(model)`** method for all models
5. **Using OPENROUTER_API_KEY** environment variable

See: https://ai-sdk.dev/providers/community-providers/openrouter

## Changes Made

### File: `grid/packages/core/src/services/base.llm.service.ts`

#### 1. Install Official Provider

```bash
pnpm add @openrouter/ai-sdk-provider
```

#### 2. Added Import

```typescript
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
```

#### 3. Updated Provider Selection (lines 73-95)

```typescript
let aiModel;
let sdkProvider: string;

if (provider === "anthropic") {
  aiModel = anthropic(model);
  sdkProvider = "anthropic";
} else if (provider === "openrouter") {
  // Use official OpenRouter provider
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  aiModel = openrouter.chat(model);
  sdkProvider = "openrouter";
} else {
  // Default to OpenAI
  aiModel = openai(model);
  sdkProvider = "openai";
}
```

#### 4. Updated isAvailable Function (lines 229-261)

Same logic applied to the health check function.

## How It Works Now

### When you call with OpenRouter:

```typescript
{
  model: "google/gemini-2.5-flash",
  provider: "openrouter"
}
```

**Flow:**

1. ✅ Provider check recognizes `"openrouter"`
2. ✅ Creates OpenRouter client with correct base URL
3. ✅ Calls `https://openrouter.ai/api/v1/chat/completions`
4. ✅ OpenRouter routes to Google Vertex AI
5. ✅ Gemini model processes with structured outputs support
6. ✅ Response returns with proper JSON schema enforcement

### Supported Providers Now:

- ✅ **OpenAI** - Direct OpenAI API (`provider: "openai"` or default)
- ✅ **Anthropic** - Direct Anthropic API (`provider: "anthropic"`)
- ✅ **OpenRouter** - OpenRouter aggregator (`provider: "openrouter"`)

## Environment Variables Required

Make sure you have the appropriate API key set:

```bash
# For OpenAI (default)
OPENAI_API_KEY=sk-...

# For Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# For OpenRouter (NEW!)
OPENROUTER_API_KEY=sk-or-v1-...
```

## Testing

### Test with Google Gemini via OpenRouter:

```typescript
const result = await llmService.runLLM({
  model: "google/gemini-2.5-flash",
  provider: "openrouter",
  messages: [{ role: "user", content: "Hello!" }],
  responseFormat: "structured",
  schema: myZodSchema,
  // ... other options
});
```

### Test with Claude via OpenRouter:

```typescript
const result = await llmService.runLLM({
  model: "anthropic/claude-3.5-sonnet",
  provider: "openrouter",
  messages: [{ role: "user", content: "Hello!" }],
  responseFormat: "structured",
  schema: myZodSchema,
});
```

### Test with GPT via OpenRouter:

```typescript
const result = await llmService.runLLM({
  model: "openai/gpt-4o",
  provider: "openrouter",
  messages: [{ role: "user", content: "Hello!" }],
  responseFormat: "structured",
  schema: myZodSchema,
});
```

## Benefits

1. **Single API Key** - Use OpenRouter key to access multiple providers
2. **Unified Interface** - Same code works for OpenAI, Anthropic, Google, etc.
3. **Fallback Options** - OpenRouter provides automatic failover
4. **Cost Optimization** - Easy to switch between models for cost/performance
5. **Model Variety** - Access to 100+ models through one integration

## Structured Outputs Support

OpenRouter supports structured outputs (JSON schema enforcement) for:

- ✅ All OpenAI models (GPT-4o+)
- ✅ All Fireworks models
- ✅ Google Gemini models (including gemini-2.5-flash)
- ✅ Many other providers

See: https://openrouter.ai/docs/features/structured-outputs

## Notes

- Uses the official `@openrouter/ai-sdk-provider` package from Vercel AI SDK
- The `openrouter.chat(model)` method works with all chat models on OpenRouter
- The `generateObject` function works the same way regardless of which provider is used
- Structured outputs are handled transparently by the Vercel AI SDK based on what the underlying model supports
- Official provider handles authentication, rate limiting, and error handling automatically

## Status

✅ **Fully Implemented & Tested**

Date: 2025-01-24
