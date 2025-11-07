# Migration Guide: MCP Support (v0.33.0 → v0.34.0)

## Overview

Grid-core now supports Model Context Protocol (MCP) servers, enabling agents to use tools from external MCP servers alongside custom tools. This guide covers the breaking changes and how to migrate your code.

---

## Breaking Changes

### 1. `createConfigurableAgent` is Now Async

**Before (v0.33.0):**

```typescript
import { createConfigurableAgent } from "@mrck-labs/grid-core";

export const createMyAgent = (): Agent => {
  return createConfigurableAgent({
    config: myAgentConfig,
    customHandlers: {
      /* ... */
    },
  });
};

// Synchronous export
export const myAgent = createMyAgent();
```

**After (v0.34.0):**

```typescript
import { createConfigurableAgent } from "@mrck-labs/grid-core";

export const createMyAgent = async (): Promise<Agent> => {
  return await createConfigurableAgent({
    config: myAgentConfig,
    customHandlers: {
      /* ... */
    },
  });
};

// Top-level await (requires ES modules)
export const myAgent = await createMyAgent();
```

**Why?** MCP client initialization is asynchronous, requiring the factory function to be async.

---

### 2. `config.tools.mcp` Schema Change

**Before (v0.33.0):**

```typescript
// Placeholder - wasn't functional
tools: {
  mcp: {},  // Empty object or undefined
}
```

**After (v0.34.0):**

```typescript
tools: {
  mcpServers: [  // New field for MCP server configs
    {
      name: "atlassian",
      url: "https://mcp-server-url.com",
      type: "http",  // or "sse"
      authToken: process.env.MCP_AUTH_TOKEN,  // optional
      headers: { /* optional */ },  // optional
    }
  ],
  mcp: {},  // Still exists for pre-configured tools (rare)
}
```

**Why?** Agents now configure MCP servers that get initialized at runtime, with tools auto-discovered.

---

## Migration Steps

### Step 1: Update Agent Factory Functions

Change all agent factories to async:

```typescript
// ❌ Before
export const createMyAgent = (): Agent => {
  return createConfigurableAgent({ config });
};

// ✅ After
export const createMyAgent = async (): Promise<Agent> => {
  return await createConfigurableAgent({ config });
};
```

### Step 2: Update Agent Exports

Use top-level await for singletons:

```typescript
// ❌ Before
export const myAgent = createMyAgent();

// ✅ After
export const myAgent = await createMyAgent();
```

**Note:** This requires your files to be ES modules. Ensure `"type": "module"` in package.json or use `.mjs` extension.

### Step 3: Update Agent Initialization Calls

Anywhere you call agent factories, add `await`:

```typescript
// ❌ Before
const agent = createMyAgent();

// ✅ After
const agent = await createMyAgent();
```

### Step 4: Add MCP Server Configs (Optional)

If you want to use MCP servers, add to your agent config:

```typescript
export const myAgentConfig = createAgentConfig({
  // ... existing config ...

  tools: {
    builtin: {},
    custom: {
      ...myCustomTools,
    },
    mcpServers: [
      // NEW!
      {
        name: "my-mcp-server",
        url: process.env.MCP_SERVER_URL,
        type: "http",
        authToken: process.env.MCP_AUTH_TOKEN,
      },
    ],
    agents: [],
  },
});
```

---

## New Capabilities

### MCP Tool Auto-Discovery

Tools from MCP servers are automatically discovered and merged with your custom tools:

```typescript
tools: {
  custom: {
    myTool1: tool1,
    myTool2: tool2,
  },
  mcpServers: [
    {
      name: "server1",
      url: "https://server1.com/mcp",
      type: "http",
    }
  ],
}

// Agent will have access to:
// - myTool1 (custom)
// - myTool2 (custom)
// - tool_from_server1 (MCP, auto-discovered)
// - another_mcp_tool (MCP, auto-discovered)
```

### MCP Lifecycle Management

MCP clients are automatically:

- ✅ Initialized when agent is created
- ✅ Connected to servers
- ✅ Tools fetched and merged
- ✅ Closed after agent execution completes (success or error)

You don't need to manage lifecycle manually!

---

## Examples

### Example 1: Simple Agent Migration

**Before:**

```typescript
import { createConfigurableAgent, type Agent } from "@mrck-labs/grid-core";
import { myConfig } from "./config";

export const createMyAgent = (): Agent => {
  return createConfigurableAgent({
    config: myConfig,
  });
};

export const myAgent = createMyAgent();
```

**After:**

```typescript
import { createConfigurableAgent, type Agent } from "@mrck-labs/grid-core";
import { myConfig } from "./config";

export const createMyAgent = async (): Promise<Agent> => {
  return await createConfigurableAgent({
    config: myConfig,
  });
};

export const myAgent = await createMyAgent();
```

### Example 2: Agent with MCP Servers

```typescript
import { createAgentConfig } from "@mrck-labs/grid-core";

export const antonConfig = createAgentConfig({
  id: "anton",
  type: "anton",
  version: "1.0.0",

  tools: {
    custom: {
      myCustomTool: tool,
    },
    mcpServers: [
      {
        name: "atlassian",
        url: process.env.ATLASSIAN_MCP_URL,
        type: "http",
        authToken: process.env.ATLASSIAN_OAUTH_TOKEN,
      },
      {
        name: "github",
        url: process.env.GITHUB_MCP_URL,
        type: "sse",
        headers: {
          "X-Custom-Header": "value",
        },
      },
    ],
  },

  // ... rest of config
});
```

### Example 3: Lazy Agent Initialization

If you can't use top-level await:

```typescript
// create-agent.ts
export const createMyAgent = async (): Promise<Agent> => {
  return await createConfigurableAgent({ config });
};

// usage.ts
let agentInstance: Agent | null = null;

const getAgent = async () => {
  if (!agentInstance) {
    agentInstance = await createMyAgent();
  }
  return agentInstance;
};

// In your code
const agent = await getAgent();
const response = await agent.act({ messages });
```

---

## Troubleshooting

### Error: "Top-level await is not available"

**Solution:** Ensure your package.json has `"type": "module"` or rename files to `.mjs`

```json
{
  "type": "module"
}
```

### Error: "MCP client failed to connect"

**Check:**

1. MCP server URL is correct and accessible
2. Auth token is valid
3. Network/firewall allows connection
4. Server is running and healthy

**Fallback:** Agent will continue without MCP tools if initialization fails (non-blocking)

### Type Error: "Type 'Promise<Agent>' is not assignable to type 'Agent'"

**Solution:** Add `await` or change type to `Promise<Agent>`

```typescript
// ❌ Wrong
const agent: Agent = createMyAgent();

// ✅ Correct
const agent: Agent = await createMyAgent();
// or
const agentPromise: Promise<Agent> = createMyAgent();
const agent = await agentPromise;
```

---

## Checklist

- [ ] Update all `createXAgent` functions to be `async`
- [ ] Add `await` to all `createConfigurableAgent` calls
- [ ] Update all agent exports to use top-level `await`
- [ ] Update any code that calls agent factories to use `await`
- [ ] Add `mcpServers` to agent configs if using MCP
- [ ] Add MCP environment variables to config
- [ ] Test agent initialization and tool discovery
- [ ] Verify MCP clients close properly after execution

---

## Support

If you encounter issues:

1. Check that grid-core is updated to v0.34.0+
2. Ensure `@ai-sdk/mcp` is installed
3. Verify your MCP server URL and auth
4. Check console logs for MCP connection errors

For questions, open an issue on the grid-core repository.
