import * as p from "@clack/prompts";
import color from "picocolors";
import {
  createConfigurableAgent,
  type CustomHandlers,
  createNamedTool,
  createToolExecutor,
} from "@mrck-labs/grid-core";
import { z } from "zod";
import {
  textWithCancel,
  isCancel,
} from "../utils/prompts.js";
import { createSpinner } from "../utils/spinners.js";

/**
 * Demonstrate all hooks with example implementations
 */
export async function exploreHooksDemo(): Promise<void> {
  p.note(
    "Explore how custom handlers (hooks) can modify agent behavior at different stages.",
    "Agent Hooks Demo"
  );

  // Get task from user
  const task = await textWithCancel(
    "What task should the agent accomplish?",
    "e.g., Calculate the sum of 1+2+3"
  );

  if (isCancel(task)) return;

  // Create a simple calculator tool for demonstration
  const calculatorTool = createNamedTool({
    name: "calculator",
    description: "Perform basic arithmetic operations",
    parameters: z.object({
      operation: z.enum(["add", "subtract", "multiply", "divide"])
        .describe("The operation to perform"),
      numbers: z.array(z.number())
        .describe("The numbers to operate on"),
    }),
    execute: async ({ operation, numbers }) => {
      let result: number;
      
      switch (operation) {
        case "add":
          result = numbers.reduce((a: number, b: number) => a + b, 0);
          break;
        case "subtract":
          result = numbers.reduce((a: number, b: number) => a - b);
          break;
        case "multiply":
          result = numbers.reduce((a: number, b: number) => a * b, 1);
          break;
        case "divide":
          result = numbers.reduce((a: number, b: number) => a / b);
          break;
        default:
          return { error: `Unknown operation: ${operation}` };
      }
      
      return { result, operation, numbers };
    },
  });

  // Create tool executor and register the calculator tool
  const toolExecutor = createToolExecutor();
  
  toolExecutor.registerTool(calculatorTool);

  // Hook execution log
  const hookLog: string[] = [];
  let currentSpinner: any = null;

  // Define custom handlers with all hooks
  const customHandlers: CustomHandlers = {
    // Transform input before processing
    transformInput: async (input) => {
      hookLog.push("🔄 transformInput: Adding context to input");
      p.log.info(color.blue("🔄 Hook: transformInput triggered"));
      
      // Add some context to the messages
      return {
        ...input,
        messages: [
          ...input.messages,
          {
            role: "system" as const,
            content: "Remember to explain your reasoning step by step.",
          },
        ],
      };
    },

    // Pre-process before LLM call
    beforeAct: async (input, config) => {
      hookLog.push("🔵 beforeAct: Pre-processing input");
      p.log.info(color.blue("🔵 Hook: beforeAct triggered"));
      p.log.message(color.dim(`  Config ID: ${config.id}`));
      p.log.message(color.dim(`  Message count: ${input.messages.length}`));
      
      // Could modify input based on config
      return input;
    },

    // Handle errors with retry logic
    onError: async (error, attempt) => {
      hookLog.push(`❌ onError: Handling error on attempt ${attempt}`);
      p.log.error(color.red(`❌ Hook: onError triggered (attempt ${attempt})`));
      p.log.message(color.dim(`  Error: ${error.message}`));
      
      // Retry on specific errors
      if (error.message.includes("timeout") && attempt < 3) {
        p.log.warning(color.yellow("  Retrying after timeout..."));
        return { retry: true };
      }
      
      // Log error but don't retry
      return undefined;
    },

    // Post-process LLM response
    afterResponse: async (response, input) => {
      hookLog.push("🟢 afterResponse: Post-processing response");
      p.log.info(color.green("🟢 Hook: afterResponse triggered"));
      p.log.message(color.dim(`  Response length: ${response.content.length}`));
      p.log.message(color.dim(`  Has tool calls: ${!!response.toolCalls?.length}`));
      
      // Add metadata about processing
      return {
        ...response,
        metadata: {
          ...response.metadata,
          processedAt: new Date().toISOString(),
          inputMessageCount: input.messages.length,
        },
      };
    },

    // Validate response structure
    validateResponse: async (response) => {
      hookLog.push("✅ validateResponse: Checking response validity");
      p.log.info(color.cyan("✅ Hook: validateResponse triggered"));
      
      const errors: string[] = [];
      
      // Check for empty response
      if (!response.content || response.content.trim().length === 0) {
        errors.push("Response content is empty");
      }
      
      // Check response length
      if (response.content && response.content.length < 10) {
        errors.push("Response is too short (less than 10 characters)");
      }
      
      const isValid = errors.length === 0;
      p.log.message(color.dim(`  Validation result: ${isValid ? "PASSED" : "FAILED"}`));
      if (!isValid) {
        p.log.message(color.dim(`  Errors: ${errors.join(", ")}`));
      }
      
      return { isValid, errors };
    },

    // Transform final output
    transformOutput: async (output) => {
      hookLog.push("🎨 transformOutput: Formatting final output");
      p.log.info(color.magenta("🎨 Hook: transformOutput triggered"));
      
      // Add summary to output
      const summary = {
        responseLength: output.content.length,
        hadToolCalls: !!output.toolCalls?.length,
        metadata: output.metadata,
      };
      
      p.log.message(color.dim(`  Summary: ${JSON.stringify(summary, null, 2)}`));
      
      return {
        ...output,
        metadata: {
          ...output.metadata,
          hooksSummary: {
            executedHooks: hookLog.map(log => log.split(":")[0]),
            totalHooks: hookLog.length,
          },
        },
      };
    },
  };

  // Create agent with all hooks
  const agent = createConfigurableAgent({
    config: {
      id: "hooks-demo-agent",
      type: "general",
      prompts: {
        system: "You are a helpful assistant that can use tools to solve problems. Always explain your reasoning.",
        errorCorrection: "Please try again with a clearer response.",
        fallback: "I apologize, but I'm having trouble processing this request. Please try rephrasing it.",
      },
      version: "1.0.0",
      metadata: {
        id: "hooks-demo-agent",
        type: "general",
        name: "Hooks Demo Agent",
        description: "Demonstrates all available hooks",
        capabilities: ["general"],
        icon: "🪝",
        version: "1.0.0",
      },
      tools: {
        builtin: [],
        custom: [calculatorTool],
        mcp: [],
        agents: [],
      },
      behavior: {
        maxRetries: 3,
        responseFormat: "text" as const,
        validateResponse: true, // Enable built-in validation
        emitEvents: ["hook_executed"],
      },
      hooks: {
        beforeAct: true,
        afterResponse: true,
        onError: true,
        validateResponse: true,
        transformInput: true,
        transformOutput: true,
      },
    },
    customHandlers,
    toolExecutor,
  });

  p.log.info(color.cyan("\n🚀 Starting agent with hooks...\n"));

  try {
    currentSpinner = createSpinner();
    currentSpinner.start(color.cyan("Agent is thinking..."));

    // Execute agent
    const response = await agent.act({
      messages: [
        {
          role: "user",
          content: String(task),
        },
      ],
      context: {
        userMessage: String(task),
      },
    });

    currentSpinner.stop(color.green("✅ Agent completed"));

    // Display response
    p.log.success(color.green("\n📝 Agent Response:"));
    p.log.message(response.content);

    if (response.toolCalls?.length) {
      p.log.info(color.blue(`\n🔧 Tool calls made: ${response.toolCalls.length}`));
      for (const toolCall of response.toolCalls) {
        p.log.message(color.dim(`  - ${toolCall.toolName}`));
      }
    }

    // Display metadata
    if (response.metadata) {
      p.log.info(color.magenta("\n📊 Response Metadata:"));
      p.log.message(color.dim(JSON.stringify(response.metadata, null, 2)));
    }

    // Display hook execution summary
    p.note(
      `Hooks Executed:\n${hookLog.map((log, i) => `${i + 1}. ${log}`).join("\n")}\n\nTotal: ${hookLog.length} hooks`,
      "Hook Execution Summary"
    );

  } catch (error) {
    if (currentSpinner) {
      currentSpinner.stop(color.red("❌ Agent failed"));
    }
    p.log.error(color.red("Failed to execute agent"));
    if (error instanceof Error) {
      p.log.error(color.dim(error.message));
      p.log.message(color.dim(`Hook log at failure: ${hookLog.join(" -> ")}`));
    }
  }

  // Ask if user wants to learn more
  const learnMore = await p.confirm({
    message: "Would you like to learn more about agent hooks?",
    initialValue: false,
  });

  if (learnMore && !p.isCancel(learnMore)) {
    p.note(
      `Agent Hooks (Custom Handlers):

1. **transformInput**: Modify input before any processing
   - Add context or metadata
   - Normalize input format

2. **beforeAct**: Pre-process before LLM call
   - Log or track requests
   - Apply rate limiting
   - Add agent-specific context

3. **onError**: Handle errors with custom logic
   - Implement retry strategies
   - Log errors to external services
   - Modify input for retry

4. **afterResponse**: Post-process LLM response
   - Add metadata
   - Track metrics
   - Enhance response

5. **validateResponse**: Ensure response quality
   - Check required fields
   - Validate format
   - Ensure safety

6. **transformOutput**: Format final output
   - Add summaries
   - Format for specific use cases
   - Add execution metadata

Each hook is optional and executes in order during the agent lifecycle.`,
      "Understanding Hooks"
    );
  }
}