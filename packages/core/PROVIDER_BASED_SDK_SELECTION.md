# Provider-Based AI SDK Selection

## Changes Made

Updated the grid-core package to use explicit provider-based SDK selection instead of model name pattern matching.

---

## What Was Changed

### 1. Added Provider to LLMServiceOptions

**File:** `src/types/llm.types.ts`

```typescript
export interface LLMServiceOptions {
  messages: ChatMessage[];
  tools?: ToolSet;
  model?: string;
  provider?: string; // ✅ NEW: Explicit provider parameter
  temperature?: number;
  // ... other options
}
```

### 2. Updated runLLM to Use Provider Parameter

**File:** `src/services/base.llm.service.ts`

**Before (Pattern Matching):**

```typescript
// ❌ Checked model name for "claude" or "anthropic/"
const isClaudeModel =
  model.toLowerCase().includes("claude") ||
  model.toLowerCase().includes("anthropic/");
const aiModel = isClaudeModel ? anthropic(model) : openai(model);
```

**After (Explicit Provider):**

```typescript
// ✅ Uses explicit provider parameter
const useAnthropic = provider === "anthropic";
const aiModel = useAnthropic
  ? anthropic(model.replace("anthropic/", "")) // Remove prefix if present
  : openai(model);

console.log(
  `🤖 [base.llm.service] Using AI SDK: ${
    useAnthropic ? "anthropic" : "openai"
  } for model: ${model}`
);
```

### 3. Factory Passes Provider to LLM

**File:** `src/factories/configurable-agent.factory.ts`

```typescript
const llmResponse = await base.llmService.runLLM({
  messages: workingMessages,
  tools: availableTools,
  sendUpdate,
  context: processedInput.context,
  model: modelToUse,
  provider: providerToUse,  // ✅ Pass provider explicitly
  traceContext: { ... },
});
```

---

## Why This Is Better

### Before (Pattern Matching)

```
Check if model name contains "claude" or "anthropic/"
  ↓
Guess which SDK to use
  ↓
Error-prone (what if model name changes?)
```

### After (Explicit Provider)

```
Check provider parameter ("anthropic" or "openai")
  ↓
Use specified SDK
  ↓
Clear, explicit, no guessing
```

---

## Benefits

✅ **Explicit** - No guessing based on model names  
✅ **Flexible** - Easy to add new providers (gemini, etc.)  
✅ **Reliable** - Won't break if model names change  
✅ **Debuggable** - Clear logs show which SDK is used  
✅ **Type-safe** - Provider is part of the interface

---

## How It Works

### Flow

```
Agent Config
  ↓ behavior.model = "claude-3-5-sonnet-20241022"
  ↓ behavior.provider = "anthropic"
  ↓
configurable-agent.factory.ts
  ↓ Resolves model and provider from priority chain
  ↓ Passes both to: base.llmService.runLLM({ model, provider })
  ↓
base.llm.service.ts
  ↓ if (provider === "anthropic") → anthropic(model)
  ↓ else → openai(model)
  ↓
Vercel AI SDK
  ↓ Calls correct API (Anthropic or OpenAI)
```

---

## Supported Providers

### anthropic

```typescript
provider: "anthropic";
model: "claude-3-5-sonnet-20241022";
// Uses: @ai-sdk/anthropic
```

### openai (default)

```typescript
provider: "openai"; // or undefined
model: "gpt-4.1";
// Uses: @ai-sdk/openai
```

### Future: Add more providers

```typescript
// Could add:
- provider: "google" → @ai-sdk/google
- provider: "mistral" → @ai-sdk/mistral
- etc.
```

---

## Example Usage

### Agent Config

```typescript
// In precision agent config
behavior: {
  model: "claude-3-5-sonnet-20241022",
  provider: "anthropic",  // ✅ Explicit provider
}
```

### Runtime Override

```typescript
await agent.act({
  messages: [...],
  context: {
    model: "gpt-4o",
    provider: "openai",  // ✅ Explicit provider
  }
});
```

---

## Log Output

You'll now see:

```
🤖 [base.llm.service] Using AI SDK: anthropic for model: claude-3-5-sonnet-20241022
```

Instead of pattern matching, it's explicitly checking `provider === "anthropic"`.

---

## Next Steps

1. Rebuild grid-core: `pnpm build --filter=@mrck-labs/grid-core`
2. Restart HQ server
3. Test with Claude model
4. Verify logs show: "Using AI SDK: anthropic"

---

**Status:** Provider-based SDK selection implemented ✅
