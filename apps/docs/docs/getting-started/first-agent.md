---
sidebar_position: 3
---

# Building Your First Agent

Let's build a complete agent application that demonstrates Grid's key features. We'll create a research assistant that can search for information, summarize findings, and save results.

## Project Setup

First, create a new project and install dependencies:

```bash
mkdir grid-research-assistant
cd grid-research-assistant
npm init -y
npm install @mrck-labs/grid-core zod dotenv
npm install -D typescript @types/node tsx
```

Create a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

## Create the Research Tools

Create `src/tools/search.tool.ts`:

```typescript
import { createNamedTool } from "@mrck-labs/grid-core";
import { z } from "zod";

export const searchTool = createNamedTool({
  name: "web_search",
  description: "Search the web for information",
  parameters: z.object({
    query: z.string().describe("The search query"),
    maxResults: z.number().default(5).describe("Maximum number of results"),
  }),
  execute: async ({ query, maxResults }) => {
    // In a real app, integrate with a search API like Serper or Bing
    // For demo purposes, we'll return mock results
    const mockResults = [
      {
        title: `Understanding ${query}`,
        snippet: `Comprehensive guide about ${query}...`,
        url: `https://example.com/${query.replace(/\s+/g, '-')}`,
      },
      {
        title: `${query} Best Practices`,
        snippet: `Learn the best practices for ${query}...`,
        url: `https://blog.example.com/${query.replace(/\s+/g, '-')}`,
      },
    ];

    return JSON.stringify(mockResults.slice(0, maxResults), null, 2);
  },
});
```

Create `src/tools/summarize.tool.ts`:

```typescript
import { createNamedTool } from "@mrck-labs/grid-core";
import { z } from "zod";

export const summarizeTool = createNamedTool({
  name: "summarize_text",
  description: "Summarize long text into key points",
  parameters: z.object({
    text: z.string().describe("The text to summarize"),
    style: z.enum(["bullet_points", "paragraph", "executive_summary"])
      .default("bullet_points")
      .describe("The summary style"),
  }),
  execute: async ({ text, style }) => {
    // In a real app, you might use a dedicated summarization service
    // For now, we'll create a simple extraction
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const keyPoints = sentences.slice(0, 3).map(s => s.trim());

    switch (style) {
      case "bullet_points":
        return keyPoints.map(point => `• ${point}`).join('\n');
      case "paragraph":
        return keyPoints.join(' ');
      case "executive_summary":
        return `Summary: ${keyPoints[0]}\n\nKey findings: ${keyPoints.slice(1).join(' ')}`;
    }
  },
});
```

Create `src/tools/save.tool.ts`:

```typescript
import { createNamedTool } from "@mrck-labs/grid-core";
import { z } from "zod";
import { writeFileSync } from "fs";
import { join } from "path";

export const saveResultsTool = createNamedTool({
  name: "save_results",
  description: "Save research results to a file",
  parameters: z.object({
    filename: z.string().describe("The filename (without extension)"),
    content: z.string().describe("The content to save"),
    format: z.enum(["markdown", "json", "text"]).default("markdown"),
  }),
  execute: async ({ filename, content, format }) => {
    const outputDir = "./research_output";
    
    // Create output directory if it doesn't exist
    if (!require('fs').existsSync(outputDir)) {
      require('fs').mkdirSync(outputDir, { recursive: true });
    }

    const extension = format === "json" ? "json" : format === "markdown" ? "md" : "txt";
    const filepath = join(outputDir, `${filename}.${extension}`);

    let formattedContent = content;
    if (format === "json") {
      try {
        formattedContent = JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        // If not valid JSON, save as is
      }
    }

    writeFileSync(filepath, formattedContent);
    return `Results saved to ${filepath}`;
  },
});
```

## Create the Research Agent

Create `src/research-agent.ts`:

```typescript
import { 
  createConfigurableAgent, 
  baseLLMService,
  createToolExecutor 
} from "@mrck-labs/grid-core";
import { searchTool } from "./tools/search.tool";
import { summarizeTool } from "./tools/summarize.tool";
import { saveResultsTool } from "./tools/save.tool";

export function createResearchAgent() {
  const llmService = baseLLMService({
    langfuse: { enabled: true }
  });
  const toolExecutor = createToolExecutor();
  
  // Register all tools with the executor
  toolExecutor.registerTool(searchTool);
  toolExecutor.registerTool(summarizeTool);
  toolExecutor.registerTool(saveResultsTool);

  return createConfigurableAgent({
    llmService,
    toolExecutor,
    config: {
      id: "research-agent",
      type: "general",
      version: "1.0.0",
      prompts: {
        system: `You are a professional research assistant. Your job is to:
        1. Search for information on topics requested by the user
        2. Analyze and summarize the findings
        3. Save the results in an organized format
        
        Always provide clear, well-structured research results. When saving files,
        use descriptive names and organize content logically.`
      },
      metadata: {
        id: "research-agent",
        type: "general",
        name: "Research Agent",
        description: "Professional research assistant",
        capabilities: ["general"],
        version: "1.0.0"
      },
      tools: {
        builtin: [],
        custom: [searchTool, summarizeTool, saveResultsTool],
        mcp: []
      },
      behavior: {
        maxRetries: 3,
        responseFormat: "text"
      }
    },
    customHandlers: {
      beforeAct: async (input, config) => {
        console.log("\n🔍 Starting research task...");
        return input;
      },
      afterResponse: async (response, input) => {
        console.log("\n✅ Research task completed!");
        return response;
      },
      onError: async (error, attempt) => {
        console.error(`\n❌ Error on attempt ${attempt}: ${error.message}`);
        if (attempt < 3) {
          return { retry: true };
        }
        return { retry: false };
      }
    }
  });
}
```

## Create the Main Application

Create `src/index.ts`:

```typescript
import { config } from "dotenv";
import { createResearchAgent } from "./research-agent";
import { createConversationLoop } from "@mrck-labs/grid-core";
import * as readline from "readline/promises";

// Load environment variables
config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  console.log("🔬 Grid Research Assistant");
  console.log("========================");
  console.log("I can help you research topics, summarize findings, and save results.");
  console.log("Type 'exit' to quit.\n");

  const agent = createResearchAgent();
  
  // Create conversation loop with progress tracking
  const conversation = await createConversationLoop({
    agent,
    onProgress: (update) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] ${update.type}: ${update.message}`);
    }
  });
  
  // Example research tasks
  const examples = [
    "Research the latest developments in quantum computing",
    "Find information about sustainable energy solutions and create a summary",
    "Search for AI ethics guidelines and save them as a markdown report",
  ];

  console.log("Example requests:");
  examples.forEach((ex, i) => console.log(`${i + 1}. ${ex}`));
  console.log("");

  while (true) {
    const input = await rl.question("What would you like to research? ");
    
    if (input.toLowerCase() === "exit") {
      break;
    }

    try {
      const response = await conversation.sendMessage(input);
      console.log("\n📊 Research Results:");
      console.log("-------------------");
      console.log(response.content);
      console.log("");
    } catch (error) {
      console.error("Error:", error.message);
    }
  }

  // Clean up
  await conversation.end();
  rl.close();
  console.log("\nThank you for using Grid Research Assistant!");
}

// Run the application
main().catch(console.error);
```

## Environment Configuration

Create a `.env` file:

```bash
# Choose your LLM provider
DEFAULT_PROVIDER=openai
DEFAULT_MODEL=gpt-4

# API Keys (set the one you're using)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Optional: Langfuse for observability
LANGFUSE_PUBLIC_KEY=your-public-key
LANGFUSE_SECRET_KEY=your-secret-key
```

## Run Your Agent

Add scripts to `package.json`:

```json
{
  "scripts": {
    "start": "tsx src/index.ts",
    "build": "tsc",
    "dev": "tsx watch src/index.ts"
  }
}
```

Start your research assistant:

```bash
npm start
```

## Example Session

```
🔬 Grid Research Assistant
========================
I can help you research topics, summarize findings, and save results.
Type 'exit' to quit.

What would you like to research? Research Grid library features and create a summary report

[10:23:45] thinking: Processing your research request...
[10:23:46] tool_execution: Running web_search...
[10:23:47] tool_execution: Running summarize_text...
[10:23:48] tool_execution: Running save_results...
[10:23:49] complete: Research task completed!

📊 Research Results:
-------------------
I've completed research on Grid library features. Here's what I found:

Key Features:
• Layered architecture for building LLM applications
• Comprehensive tool system with Vercel AI SDK integration  
• Built-in observability with Langfuse support
• Extensive hook system for customization
• Real-time progress streaming
• Support for autonomous agent loops

The full research report has been saved to research_output/grid-library-features.md

Would you like me to research any specific aspect in more detail?
```

## Next Steps

You've built a complete research assistant! To enhance it further:

1. **Add Real APIs**: Integrate actual search APIs like Serper or Bing
2. **Enhance Tools**: Add more tools for data analysis, visualization, or API calls
3. **Add Persistence**: Store research history in a database
4. **Create a Web Interface**: Use the Next.js integration to build a UI
5. **Enable Observability**: Set up Langfuse to monitor your agent's performance

Continue learning:
- [Explore core concepts](/docs/core-concepts/agents)
- [Build custom tools](/docs/core-concepts/tools)
- [Add observability](/docs/core-concepts/observability)
- [Use pre-built agents](/docs/getting-started/pre-built-agents)