import { createConfigurableAgent, baseLLMService } from "@mrck-labs/grid-core";
import type { Agent } from "@mrck-labs/grid-core";
import {
  calculatorTool,
  randomNumberTool,
  hashTool,
  systemInfoTool,
  dataConverterTool,
  jsonFormatterTool,
} from "@mrck-labs/grid-core";

/**
 * Math & Data Agent - Specialized for calculations and data processing
 *
 * This agent is configured with tools for:
 * - Mathematical calculations
 * - Random number generation for simulations
 * - Hash generation for data integrity
 * - System information gathering
 * - Data format conversions
 * - JSON manipulation
 */
export const mathDataAgent: Agent = createConfigurableAgent({
  llmService: baseLLMService({
    toolExecutionMode: "custom",
  }),
  config: {
    id: "math-data-agent",
    type: "general",
    prompts: {
      system: `You are a specialized computational assistant with expertise in mathematics, data processing, and analytical operations.

Your core capabilities:
- Perform complex mathematical calculations with precision
- Generate random data for simulations and testing
- Create hashes for data integrity and security
- Analyze system information and performance
- Convert between various data formats
- Process and validate JSON structures

When handling computational tasks:
1. Always verify calculations for accuracy
2. Show your work step-by-step for complex problems
3. Use appropriate precision for numerical results
4. Explain the methodology used
5. Provide multiple approaches when applicable
6. Include units and context in your answers

You excel at:
- Statistical analysis and probability calculations
- Data transformation and normalization
- Algorithm implementation and optimization
- Performance analysis and benchmarking
- Cryptographic operations and data security
- Scientific computing and simulations`,
    },
    version: "1.0.0",
    metadata: {
      id: "math-data-agent",
      type: "general",
      name: "Math & Data Processor",
      description:
        "An agent specialized in mathematical calculations and data processing",
      capabilities: ["general"],
      icon: "🧮",
      version: "1.0.0",
    },
    tools: {
      builtin: [],
      custom: [
        calculatorTool,
        randomNumberTool,
        hashTool,
        systemInfoTool,
        dataConverterTool,
        jsonFormatterTool,
      ],
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
  // Tool execution handled by toolExecutor
});

/**
 * Create a custom math & data agent with additional configuration
 */
export function createCustomMathDataAgent(options?: {
  temperature?: number;
  additionalTools?: any[];
  systemPromptAddition?: string;
  enableVerboseLogging?: boolean;
}): Agent {
  const baseSystemPrompt = `You are a specialized computational assistant with expertise in mathematics, data processing, and analytical operations.

Your core capabilities:
- Perform complex mathematical calculations with precision
- Generate random data for simulations and testing
- Create hashes for data integrity and security
- Analyze system information and performance
- Convert between various data formats
- Process and validate JSON structures

When handling computational tasks:
1. Always verify calculations for accuracy
2. Show your work step-by-step for complex problems
3. Use appropriate precision for numerical results
4. Explain the methodology used
5. Provide multiple approaches when applicable
6. Include units and context in your answers

You excel at:
- Statistical analysis and probability calculations
- Data transformation and normalization
- Algorithm implementation and optimization
- Performance analysis and benchmarking
- Cryptographic operations and data security
- Scientific computing and simulations`;

  return createConfigurableAgent({
    llmService: baseLLMService({
      toolExecutionMode: "custom",
    }),
    config: {
      id: "custom-math-data-agent",
      type: "general",
      prompts: {
        system: options?.systemPromptAddition
          ? `${baseSystemPrompt}\n\n${options.systemPromptAddition}`
          : baseSystemPrompt,
      },
      version: "1.0.0",
      metadata: {
        id: "custom-math-data-agent",
        type: "general",
        name: "Custom Math & Data Processor",
        description: "A customized math and data processing agent",
        capabilities: ["general"],
        icon: "🧮",
        version: "1.0.0",
      },
      tools: {
        builtin: [],
        custom: [
          calculatorTool,
          randomNumberTool,
          hashTool,
          systemInfoTool,
          dataConverterTool,
          jsonFormatterTool,
          ...(options?.additionalTools || []),
        ],
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
    // Verbose logging can be added through toolExecutor if needed
  });
}
