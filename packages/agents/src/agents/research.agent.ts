import { createConfigurableAgent, baseLLMService } from "@mrck-labs/grid-core";
import type { Agent } from "@mrck-labs/grid-core";
import {
  readUrlTool,
  stringUtilsTool,
  jsonFormatterTool,
  dataConverterTool,
} from "@mrck-labs/grid-core";

/**
 * Research Agent - Specialized for information gathering and analysis
 *
 * This agent is configured with tools for:
 * - Web content reading and extraction
 * - Text processing and manipulation
 * - Data formatting and conversion
 * - JSON handling and validation
 */
export const researchAgent: Agent = createConfigurableAgent({
  llmService: baseLLMService({
    toolExecutionMode: "custom",
  }),
  config: {
    id: "research-agent",
    type: "general",
    prompts: {
      system: `You are a specialized research assistant with expertise in gathering, analyzing, and organizing information.

Your core capabilities:
- Extract and analyze content from web pages
- Process and manipulate text data efficiently
- Format and structure data in various formats (JSON, CSV, TSV)
- Validate and clean data for consistency

When conducting research:
1. Be thorough and systematic in your approach
2. Verify information accuracy when possible
3. Organize findings in a clear, structured manner
4. Provide sources and references
5. Highlight key insights and patterns
6. Present data in the most appropriate format

You excel at:
- Literature reviews and summarization
- Data extraction and cleaning
- Comparative analysis
- Information synthesis
- Report generation`,
    },
    version: "1.0.0",
    metadata: {
      id: "research-agent",
      type: "general",
      name: "Research Assistant",
      description:
        "An agent specialized in research, data gathering, and analysis",
      capabilities: ["general"],
      icon: "🔬",
      version: "1.0.0",
    },
    tools: {
      builtin: [],
      custom: [
        readUrlTool,
        stringUtilsTool,
        jsonFormatterTool,
        dataConverterTool,
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
 * Create a custom research agent with additional configuration
 */
export function createCustomResearchAgent(options?: {
  temperature?: number;
  additionalTools?: any[];
  systemPromptAddition?: string;
}): Agent {
  const baseSystemPrompt = `You are a specialized research assistant with expertise in gathering, analyzing, and organizing information.

Your core capabilities:
- Extract and analyze content from web pages
- Process and manipulate text data efficiently
- Format and structure data in various formats (JSON, CSV, TSV)
- Validate and clean data for consistency

When conducting research:
1. Be thorough and systematic in your approach
2. Verify information accuracy when possible
3. Organize findings in a clear, structured manner
4. Provide sources and references
5. Highlight key insights and patterns
6. Present data in the most appropriate format

You excel at:
- Literature reviews and summarization
- Data extraction and cleaning
- Comparative analysis
- Information synthesis
- Report generation`;

  return createConfigurableAgent({
    llmService: baseLLMService({
      toolExecutionMode: "custom",
    }),
    config: {
      id: "custom-research-agent",
      type: "general",
      prompts: {
        system: options?.systemPromptAddition
          ? `${baseSystemPrompt}\n\n${options.systemPromptAddition}`
          : baseSystemPrompt,
      },
      version: "1.0.0",
      metadata: {
        id: "custom-research-agent",
        type: "general",
        name: "Custom Research Assistant",
        description: "A customized research agent",
        capabilities: ["general"],
        icon: "🔬",
        version: "1.0.0",
      },
      tools: {
        builtin: [],
        custom: [
          readUrlTool,
          stringUtilsTool,
          jsonFormatterTool,
          dataConverterTool,
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
  });
}
