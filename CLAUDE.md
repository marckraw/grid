# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development Workflow

```bash
# Install dependencies (always use pnpm)
pnpm install

# Build all packages
pnpm build

# Build specific package
pnpm --filter @mrck-labs/grid-core build
pnpm --filter terminal-agent build

# Run development mode
pnpm dev

# Run specific app in dev mode
pnpm --filter terminal-agent dev

# Run tests
pnpm test

# Run specific package tests
pnpm --filter @mrck-labs/grid-core test

# Lint and format code
pnpm lint

# Create a changeset for release
pnpm changeset

# Check release status
pnpm release:status
```

### Important Build Notes
- The core package uses `zshy` for bundler-free TypeScript compilation
- Packages are built as dual ESM/CJS modules
- Use `pnpm` exclusively - the project uses workspaces and pnpm@8.15.1

## Architecture Overview

### Monorepo Structure
Grid is a TypeScript monorepo for LLM orchestration using:
- **Turborepo** for build orchestration
- **pnpm workspaces** for package management
- **Changesets** for versioning and releases

### Core Packages

#### @mrck-labs/grid-core
The foundational package providing:
- **LLM Integration**: Uses Vercel AI SDK for OpenAI/Anthropic support
- **Tool System**: Fully aligned with Vercel AI SDK's tool format using Zod schemas
- **Agent Factory**: `createConfigurableAgent` with extensive hook system
- **Services**:
  - `baseLLMService`: Wraps Vercel AI SDK's `generateText`
  - `agentFlowService`: Manages autonomous agent loops
  - `toolExecutor`: Executes Vercel AI SDK tools

Key architectural decisions:
- Tools use Vercel AI SDK's `CoreTool` type with Zod parameter schemas
- Message format uses `toolCalls` (not `tool_calls`) matching Vercel AI SDK
- Tools are passed as objects keyed by name to the LLM service

#### @mrck-labs/grid-agents
Agent implementations built on core primitives.

#### @mrck-labs/grid-workflows
Workflow orchestration for multi-step processes.

### Applications

#### terminal-agent
CLI demo application showcasing Grid features:
- Entry point: `src/cli.ts`
- Commands in `src/commands/` demonstrate different capabilities
- Uses `.env` for API keys (copy from `.env.example`)

### Key Integration Points

#### Tool Creation Pattern
```typescript
import { createNamedTool } from "@mrck-labs/grid-core";
import { z } from "zod";

const tool = createNamedTool({
  name: "toolName",
  description: "Tool description",
  parameters: z.object({
    param: z.string().describe("Parameter description")
  }),
  execute: async ({ param }) => {
    // Tool implementation
    return result;
  }
});
```

#### Agent Configuration
Agents are created with extensive configuration including:
- System prompts
- Tool configurations
- Custom handlers (hooks) for lifecycle events
- Behavior settings (retries, validation, etc.)

### Recent Refactoring Context
The codebase was recently refactored to fully align with Vercel AI SDK:
- Removed legacy JSON Schema tool format
- Eliminated backward compatibility layers
- Tools now use native Vercel AI SDK format throughout
- Message types updated to match Vercel AI SDK conventions

### Environment Configuration
Terminal agent requires API keys in `.env`:
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for LLM access
- `DEFAULT_MODEL` can be set to preferred model

### Release Process
Automated releases via GitHub Actions:
- Beta releases from `develop` branch
- Stable releases from `master` branch
- Use `pnpm changeset` to document changes