---
sidebar_position: 6
---

# Pre-built Agents

Grid provides pre-configured agents through the `@mrck-labs/grid-agents` package. These agents come with specialized tools and optimized prompts for specific use cases, allowing you to get started quickly without building everything from scratch.

## Installation

```bash npm2yarn
npm install @mrck-labs/grid-agents @mrck-labs/grid-core
```

## Available Agents

### Research Agent

The research agent is specialized for information gathering, analysis, and content processing tasks.

**Features:**
- Web content extraction and reading
- Text manipulation and formatting
- Data conversion between formats
- Structured output generation

**Tools Included:**
- `readUrl` - Extract content from web pages
- `stringUtils` - Text manipulation (uppercase, lowercase, reverse)
- `jsonFormatter` - Format and validate JSON
- `dataConverter` - Convert between JSON, CSV, and XML

**Usage:**
```typescript
import { researchAgent } from "@mrck-labs/grid-agents";

// Use directly
const response = await researchAgent.act(
  "Research the latest developments in quantum computing and summarize the key findings"
);

console.log(response.content);
```

**Example Tasks:**
```typescript
// Web research
await researchAgent.act(
  "Read https://example.com/article and extract the main points"
);

// Data processing
await researchAgent.act(
  "Convert this CSV data to JSON format: Name,Age,City\\nJohn,30,NYC\\nJane,25,LA"
);

// Content analysis
await researchAgent.act(
  "Analyze this text and identify the key themes: [long text here]"
);
```

### Math & Data Agent

The math & data agent is optimized for calculations, data processing, and system operations.

**Features:**
- Mathematical calculations
- Random number generation
- Cryptographic operations
- System information retrieval

**Tools Included:**
- `calculator` - Perform mathematical calculations
- `randomNumber` - Generate random numbers
- `hash` - Create MD5 and SHA256 hashes
- `systemInfo` - Get system platform and version

**Usage:**
```typescript
import { mathDataAgent } from "@mrck-labs/grid-agents";

// Perform calculations
const response = await mathDataAgent.act(
  "Calculate the compound interest on $10,000 at 5% annual rate for 10 years"
);

console.log(response.content);
```

**Example Tasks:**
```typescript
// Complex calculations
await mathDataAgent.act(
  "What's the monthly payment for a $300,000 mortgage at 4.5% for 30 years?"
);

// Data analysis
await mathDataAgent.act(
  "Generate 10 random numbers between 1 and 100 and calculate their average"
);

// Security operations
await mathDataAgent.act(
  "Create a SHA256 hash of the password 'SecurePass123'"
);

// System information
await mathDataAgent.act(
  "What operating system and version is this running on?"
);
```

## Using All Agents

You can import all agents at once for convenient access:

```typescript
import { allAgents } from "@mrck-labs/grid-agents";

// Access agents by name
const researcher = allAgents.research;
const calculator = allAgents.mathData;

// Use in an application
async function processRequest(task: string, type: "research" | "math") {
  const agent = type === "research" 
    ? allAgents.research 
    : allAgents.mathData;
    
  return await agent.act(task);
}
```

## Customizing Pre-built Agents

While pre-built agents work out of the box, you can customize them for your specific needs:

### Option 1: Extend with Additional Tools

```typescript
import { researchAgent } from "@mrck-labs/grid-agents";
import { createConfigurableAgent, baseLLMService } from "@mrck-labs/grid-core";
import { myCustomTool } from "./tools";

// Get the base configuration
const baseConfig = researchAgent.config;

// Create extended agent
const extendedResearchAgent = createConfigurableAgent({
  llmService: baseLLMService({
    model: "gpt-4",
    apiKey: process.env.OPENAI_API_KEY,
  }),
  config: {
    ...baseConfig,
    availableTools: [
      ...baseConfig.availableTools,
      myCustomTool,
    ],
  },
});
```

### Option 2: Override Configuration

```typescript
import { mathDataAgent } from "@mrck-labs/grid-agents";
import { createConfigurableAgent, baseLLMService } from "@mrck-labs/grid-core";

// Create customized version
const customMathAgent = createConfigurableAgent({
  llmService: baseLLMService({
    model: "claude-3-opus",  // Use different model
    apiKey: process.env.ANTHROPIC_API_KEY,
    temperature: 0.2,  // Lower temperature for more consistent math
  }),
  config: {
    ...mathDataAgent.config,
    systemPrompt: `${mathDataAgent.config.systemPrompt}
    
    Additional instructions:
    - Always show your work step by step
    - Double-check calculations before responding
    - Use scientific notation for very large numbers`,
  },
});
```

### Option 3: Add Event Handlers

```typescript
import { researchAgent } from "@mrck-labs/grid-agents";
import { createConversationLoop } from "@mrck-labs/grid-core";

// Wrap with conversation loop for persistence
const persistentResearch = createConversationLoop({
  agent: researchAgent,
  handlers: {
    onMessageSent: async (message) => {
      await db.research.create({
        data: {
          query: message,
          timestamp: new Date(),
        },
      });
    },
    onResponseReceived: async (response) => {
      await db.research.update({
        data: {
          result: response.content,
          toolsUsed: response.toolCalls?.map(t => t.name),
        },
      });
    },
  },
});
```

## Real-World Examples

### Research Assistant Application

```typescript
import { researchAgent } from "@mrck-labs/grid-agents";
import express from "express";

const app = express();
app.use(express.json());

app.post("/research", async (req, res) => {
  try {
    const { topic } = req.body;
    
    // Perform research
    const response = await researchAgent.act(
      `Research "${topic}" and provide:
      1. Overview of the topic
      2. Recent developments
      3. Key sources and references
      4. Summary of findings`
    );
    
    res.json({
      success: true,
      topic,
      research: response.content,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

### Data Processing Pipeline

```typescript
import { mathDataAgent, researchAgent } from "@mrck-labs/grid-agents";

async function processDataPipeline(csvUrl: string) {
  // Step 1: Fetch data
  const fetchResponse = await researchAgent.act(
    `Read the CSV data from ${csvUrl}`
  );
  
  // Step 2: Convert to JSON
  const conversionResponse = await researchAgent.act(
    `Convert this CSV data to JSON: ${fetchResponse.content}`
  );
  
  // Step 3: Analyze data
  const analysisResponse = await mathDataAgent.act(
    `Analyze this data and calculate summary statistics: ${conversionResponse.content}`
  );
  
  return {
    rawData: fetchResponse.content,
    jsonData: conversionResponse.content,
    analysis: analysisResponse.content,
  };
}
```

### Multi-Agent Collaboration

```typescript
import { allAgents } from "@mrck-labs/grid-agents";

async function analyzeCompanyData(companyUrl: string, financialData: string) {
  // Research agent gathers information
  const companyInfo = await allAgents.research.act(
    `Research the company at ${companyUrl} and extract key information`
  );
  
  // Math agent analyzes financials
  const financialAnalysis = await allAgents.mathData.act(
    `Analyze these financial metrics and calculate key ratios: ${financialData}`
  );
  
  // Research agent creates final report
  const finalReport = await allAgents.research.act(
    `Create a comprehensive company analysis report combining:
    Company Information: ${companyInfo.content}
    Financial Analysis: ${financialAnalysis.content}`
  );
  
  return finalReport.content;
}
```

## Performance Considerations

### Model Selection

Pre-built agents use the model specified in your environment:

```bash
# .env file
DEFAULT_MODEL=gpt-4
OPENAI_API_KEY=your-key-here

# Or use Anthropic
DEFAULT_MODEL=claude-3-opus
ANTHROPIC_API_KEY=your-key-here
```

### Token Usage

Different agents have different token usage patterns:

- **Research Agent**: Higher token usage due to web content processing
- **Math & Data Agent**: Lower token usage, more focused calculations

Monitor usage:

```typescript
const response = await researchAgent.act("Research quantum computing");
console.log("Tokens used:", response.usage?.totalTokens);
```

### Caching Strategies

Implement caching for frequently requested information:

```typescript
const cache = new Map();

async function cachedResearch(topic: string) {
  if (cache.has(topic)) {
    return cache.get(topic);
  }
  
  const response = await researchAgent.act(
    `Research: ${topic}`
  );
  
  cache.set(topic, response);
  return response;
}
```

## Best Practices

### 1. Choose the Right Agent

- Use **Research Agent** for:
  - Web content extraction
  - Text analysis and summarization
  - Data format conversion
  - Content generation

- Use **Math & Data Agent** for:
  - Numerical calculations
  - Statistical analysis
  - Cryptographic operations
  - System queries

### 2. Combine Agents

Leverage multiple agents for complex tasks:

```typescript
// Research finds data, Math analyzes it
const data = await researchAgent.act("Find stock prices for AAPL");
const analysis = await mathDataAgent.act(
  `Calculate the 30-day moving average: ${data.content}`
);
```

### 3. Error Handling

Always handle potential failures:

```typescript
try {
  const response = await researchAgent.act(query);
  return response.content;
} catch (error) {
  if (error.message.includes("rate limit")) {
    // Implement retry logic
  }
  throw error;
}
```

### 4. Prompt Engineering

Enhance agent responses with specific instructions:

```typescript
const detailedResponse = await researchAgent.act(
  `Research renewable energy trends.
  Requirements:
  - Focus on 2024 developments
  - Include statistical data
  - Cite sources
  - Maximum 500 words`
);
```

## Next Steps

- [Create custom agents](/docs/core-concepts/agents)
- [Build custom tools](/docs/core-concepts/tools)
- [Implement persistence](/docs/getting-started/event-handlers)
- [Monitor with observability](/docs/core-concepts/observability)