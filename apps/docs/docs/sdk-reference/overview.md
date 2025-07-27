---
sidebar_position: 1
---

# SDK Reference Overview

Welcome to the Grid SDK Reference. This section provides comprehensive API documentation for all exported primitives, services, and utilities in the Grid framework.

## What You'll Find Here

The SDK Reference is organized by category, providing detailed technical documentation for:

- **[Conversation Primitives](./conversation-primitives/conversation-history)** - Building blocks for conversation management
- **[Services](./services/base-llm-service)** - Core services for LLM integration and orchestration
- **[Factories](./factories/configurable-agent)** - Factory functions for creating agents
- **[Tools](./tools/create-named-tool)** - Utilities for creating and managing tools
- **[Types](./types/agent-types)** - TypeScript type definitions
- **[Utilities](./utilities/transform-messages)** - Helper functions and utilities

## Documentation Format

Each API reference page includes:

### 1. Overview
A brief description of what the API does and when to use it.

### 2. Import Statement
```typescript
import { apiName } from "@mrck-labs/grid-core";
```

### 3. Function Signature
Complete TypeScript signature with generics and parameter types.

### 4. Parameters
Detailed documentation of all parameters including:
- Type information
- Default values
- Optional vs required
- Nested object properties

### 5. Return Type
What the function returns, including:
- Object methods and properties
- Type definitions
- Usage examples

### 6. Event Handlers
For APIs that support events:
- Available handlers
- Handler signatures
- When handlers are called

### 7. Examples
Practical code examples showing:
- Basic usage
- Advanced patterns
- Integration with other APIs

## Quick Links

### Most Used APIs

- [`createConfigurableAgent`](./factories/configurable-agent) - Create customizable agents
- [`createNamedTool`](./tools/create-named-tool) - Create tools for agents
- [`baseLLMService`](./services/base-llm-service) - Configure LLM providers
- [`createConversationLoop`](./conversation-primitives/conversation-loop) - Manage conversation flows

### Conversation Management

- [`createConversationHistory`](./conversation-primitives/conversation-history) - Message storage
- [`createConversationContext`](./conversation-primitives/conversation-context) - State management
- [`createConversationManager`](./conversation-primitives/conversation-manager) - Combined interface

### Services

- [`createToolExecutor`](./services/tool-executor) - Tool execution service
- [`agentFlowService`](./services/agent-flow-service) - Autonomous agent flows
- [`createLangfuseService`](./services/langfuse-service) - Observability integration

## Package Information

All APIs documented here are exported from:

```bash
@mrck-labs/grid-core
```

Install with:
```bash
npm install @mrck-labs/grid-core
```

## TypeScript Support

Grid is written in TypeScript and provides full type definitions. All examples in this reference use TypeScript, but the library can be used with JavaScript as well.

## Getting Help

- For conceptual understanding, see the [Core Concepts](/docs/core-concepts/agents) section
- For tutorials and guides, see the [Getting Started](/docs/getting-started/installation) section
- For examples, check our [GitHub repository](https://github.com/mrck-labs/grid)

## Contributing

Found an issue or want to contribute to the documentation? Please open an issue or PR on our [GitHub repository](https://github.com/mrck-labs/grid).