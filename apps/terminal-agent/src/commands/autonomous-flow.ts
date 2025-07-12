import * as p from "@clack/prompts";
import color from "picocolors";
import {
  agentFlowService,
  type ProgressMessage,
  type AgentFlowContext,
  type LLMService,
  createConfigurableAgent,
} from "@mrck-labs/grid-core";
import {
  textWithCancel,
  selectWithCancel,
  isCancel,
} from "../utils/prompts.js";
import { createSpinner } from "../utils/spinners.js";
import type { MenuOption } from "../types/index.js";

export async function exploreAutonomousFlow(): Promise<void> {
  p.note(
    "Explore autonomous agent loops that can work independently to achieve goals.",
    "Autonomous Agent Flow"
  );

  // Get task from user
  const task = await textWithCancel(
    "What task should the autonomous agent accomplish?",
    "e.g., Research the top 3 JavaScript frameworks and compare them"
  );

  if (isCancel(task)) return;

  // Ask for max iterations
  const maxIterationsOptions: MenuOption[] = [
    { value: "5", label: "5 iterations", hint: "Quick exploration" },
    { value: "10", label: "10 iterations", hint: "Default" },
    { value: "20", label: "20 iterations", hint: "Thorough exploration" },
  ];

  const maxIterations = await selectWithCancel<string>(
    "Maximum iterations for the agent?",
    maxIterationsOptions
  );

  if (isCancel(maxIterations)) return;

  // Initialize the agent flow service
  const service = agentFlowService();

  // Create a progress display
  const progressLog: string[] = [];
  let currentSpinner: any = null;

  // Set up the send function to handle progress updates
  service.setSendFunction(async (progressMessage: ProgressMessage) => {
    const { type, content, metadata } = progressMessage;

    // Stop current spinner if running
    if (currentSpinner) {
      currentSpinner.stop();
      currentSpinner = null;
    }

    // Handle different message types
    switch (type) {
      case "thinking":
        currentSpinner = createSpinner();
        currentSpinner.start(color.cyan("🤔 " + content));
        break;

      case "agent_thought":
        p.log.info(color.blue("💭 Agent: " + content));
        progressLog.push(`Thought: ${content}`);
        break;

      case "tool_execution":
        p.log.message(color.yellow("🔧 " + content));
        progressLog.push(`Tool: ${content}`);
        break;

      case "llm_response":
        p.log.success(color.green("✨ " + content));
        progressLog.push(`Response: ${content}`);
        break;

      case "error":
        p.log.error(color.red("❌ " + content));
        progressLog.push(`Error: ${content}`);
        break;

      case "finished":
        if (currentSpinner) {
          currentSpinner.stop(color.green("✅ " + content));
          currentSpinner = null;
        }
        break;

      case "notification":
        p.log.step(color.magenta("📢 " + content));
        break;

      default:
        p.log.message(color.gray(`[${type}] ${content}`));
        progressLog.push(`${type}: ${content}`);
    }

    // Show metadata if available
    if (metadata) {
      p.log.message(color.dim(`   Metadata: ${JSON.stringify(metadata)}`));
    }
  });

  p.log.info(color.cyan("\n🚀 Starting autonomous agent flow...\n"));
  p.log.message(color.dim(`Task: ${task}`));
  p.log.message(color.dim(`Max iterations: ${maxIterations}\n`));

  const agent = createConfigurableAgent({
    config: {
      id: "autonomous-agent",
      type: "general",
      prompts: {
        system:
          "You are a helpful assistant that breaks down tasks into steps.",
      },
      version: "1.0.0",
      metadata: {
        id: "autonomous-agent",
        type: "general",
        name: "Autonomous Demo Agent",
        description: "Demonstrates autonomous flow capabilities",
        capabilities: ["general"],
        icon: "🤖",
        version: "1.0.0",
      },
      tools: {
        builtin: [],
        custom: [],
        mcp: [],
        agents: [],
      },
      behavior: {
        maxRetries: 3,
        responseFormat: "text" as const,
        validateResponse: false,
        emitEvents: [],
      },
      orchestration: {},
    },
    // Use custom LLM service if selected
    llmService: undefined,
  });

  try {
    // Create enhanced context with state management
    const context: AgentFlowContext = {
      userMessage: String(task),
      maxIterations: parseInt(String(maxIterations)),
      continueOnToolCalls: true,
      state: {
        taskStartTime: Date.now(),
        originalTask: String(task),
      },
      metadata: {
        source: "terminal-agent",
        demo: true,
      },
    };

    p.log.info(color.blue("\n📊 Context Configuration:"));
    p.log.message(`  Max Iterations: ${context.maxIterations}`);
    p.log.message(`  Continue on Tools: ${context.continueOnToolCalls}`);
    p.log.message(`  Initial State: ${JSON.stringify(context.state)}\n`);

    // Execute the autonomous flow
    await service.executeAutonomousFlow({
      agent,
      context,
    });

    // Display summary
    p.note(
      `Task: ${task}\n\nProgress Log:\n${progressLog
        .map((log, i) => `${i + 1}. ${log}`)
        .join("\n")}\n\nThe autonomous flow completed successfully!`,
      "Autonomous Flow Summary"
    );
  } catch (error) {
    if (currentSpinner) {
      currentSpinner.stop();
    }
    p.log.error(color.red("Failed to execute autonomous flow"));
    if (error instanceof Error) {
      p.log.error(color.dim(error.message));
    }
  }

  // Ask if user wants to see implementation details
  const showDetails = await p.confirm({
    message: "Would you like to learn more about how autonomous flows work?",
    initialValue: false,
  });

  if (showDetails && !p.isCancel(showDetails)) {
    p.note(
      `Autonomous Agent Flows:

1. **Initialization**: The agent receives a task/goal
2. **Planning**: Agent breaks down the task into steps
3. **Execution Loop**: 
   - Think about next action
   - Execute tools/actions
   - Evaluate progress
   - Repeat until goal achieved or max iterations
4. **Completion**: Return final result

Key Components:
- Context management
- Tool execution
- Progress tracking
- Error handling
- Iteration limits`,
      "How It Works"
    );
  }
}
