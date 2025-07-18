/**
 * Example: Using Grid with Langfuse Observability
 * 
 * This example demonstrates how to integrate Langfuse observability
 * with Grid's core services for tracing LLM calls, tool executions,
 * and conversation flows.
 */

import {
  createTracedServices,
  createLangfuseProvider,
  createConfigurableAgent,
  createNamedTool,
} from "@mrck-labs/grid-core";
import { z } from "zod";

// 1. Create a Langfuse provider
const langfuseProvider = createLangfuseProvider({
  // API keys can be set via environment variables:
  // LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_BASEURL
  debug: true, // Enable debug logging
  flushInterval: 5000, // Flush every 5 seconds
});

// 2. Create some example tools
const calculatorTool = createNamedTool({
  name: "calculator",
  description: "Perform basic arithmetic operations",
  parameters: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
    operation: z.enum(["add", "subtract", "multiply", "divide"]).describe("Operation to perform"),
  }),
  execute: async ({ a, b, operation }) => {
    switch (operation) {
      case "add": return a + b;
      case "subtract": return a - b;
      case "multiply": return a * b;
      case "divide": return b !== 0 ? a / b : "Error: Division by zero";
    }
  },
});

const weatherTool = createNamedTool({
  name: "get_weather",
  description: "Get the current weather for a location",
  parameters: z.object({
    location: z.string().describe("City name"),
  }),
  execute: async ({ location }) => {
    // Simulated weather data
    return {
      location,
      temperature: Math.floor(Math.random() * 30) + 10,
      condition: ["sunny", "cloudy", "rainy"][Math.floor(Math.random() * 3)],
    };
  },
});

// 3. Create traced services with observability
const services = createTracedServices({
  observability: {
    enabled: true,
    provider: langfuseProvider,
    sampling: 1.0, // Trace 100% of requests
    filters: {
      excludeTools: [], // Don't exclude any tools
      excludeEvents: [], // Don't exclude any events
      sensitiveFields: ["apiKey", "password"], // Redact sensitive fields
    },
    attributes: {
      service: "terminal-agent",
      environment: process.env.NODE_ENV || "development",
    },
    debug: true,
  },
  llm: {
    defaultModel: "gpt-4",
    toolExecutionMode: "custom", // Use our tool executor
  },
  tools: [calculatorTool, weatherTool],
});

// 4. Use the traced services
export async function runObservabilityExample() {
  console.log("🔍 Starting observability example with Langfuse...\n");

  // Start a conversation session
  const traceContext = await services.startConversation(
    "session-123", // Session ID
    "user-456" // User ID
  );

  try {
    // Register tools with the executor
    services.toolExecutor.registerTool(calculatorTool);
    services.toolExecutor.registerTool(weatherTool);

    // Create an agent with observability
    const agent = createConfigurableAgent({
      config: {
        id: "weather-assistant",
        type: "assistant",
        version: "1.0.0",
        metadata: {
          name: "Weather Assistant",
          description: "An assistant that can check weather and do calculations",
          capabilities: ["weather", "math"],
          tags: ["example", "observability"],
        },
        prompts: {
          system: "You are a helpful weather assistant. You can check weather and perform calculations.",
        },
        behavior: {
          maxRetries: 3,
          responseFormat: "text",
        },
        tools: {
          custom: [calculatorTool, weatherTool],
        },
        observability: {
          enabled: true,
          sampling: 1.0,
        },
      },
      llmService: services.llmService,
      toolExecutor: services.toolExecutor,
      observability: services.observabilityService,
    });

    // Send messages through the conversation flow
    console.log("User: What's the weather in Tokyo and what's 25 + 17?");
    
    const result = await services.conversationFlow.sendMessageWithToolResolution(
      "What's the weather in Tokyo and what's 25 + 17?"
    );

    console.log("\nAssistant:", result.response.content);

    // Get flow statistics
    const stats = services.conversationFlow.getFlowStats();
    console.log("\n📊 Flow Statistics:");
    console.log(`- Iterations: ${stats.iterations}`);
    console.log(`- Elapsed time: ${stats.elapsedTime}ms`);
    console.log(`- Average iteration time: ${stats.averageIterationTime.toFixed(2)}ms`);

    // Send another message
    console.log("\nUser: Can you multiply the temperature in Tokyo by 2?");
    
    const result2 = await services.conversationFlow.sendMessageWithToolResolution(
      "Can you multiply the temperature in Tokyo by 2?"
    );

    console.log("\nAssistant:", result2.response.content);

  } finally {
    // End the conversation trace
    await services.endConversation(traceContext);

    // Flush any pending observability data
    await services.flush();

    console.log("\n✅ Observability data has been sent to Langfuse");
    console.log("📈 Check your Langfuse dashboard to see the traces!");
  }
}

// Run the example if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runObservabilityExample()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Error:", error);
      process.exit(1);
    });
}