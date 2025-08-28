import * as p from "@clack/prompts";
import { textWithCancel, isCancel } from "../utils/prompts.js";
import { createSpinner } from "../utils/spinners.js";
import pc from "picocolors";
import {
  generateText,
  generateObject,
  streamText,
  stepCountIs,
  hasToolCall,
  type ToolSet,
  type ModelMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  calculatorTool,
  currentTimeTool,
  systemInfoTool,
} from "@mrck-labs/grid-core";
import { createConfigurableAgent } from "@mrck-labs/grid-core";
import { getTools } from "../utils/tools.js";

export async function simpleVercelAISDKTest(): Promise<void> {
  p.intro(pc.cyan("🤖 Simple Vercel AI SDK Test"));
  p.log.info("Chat with an AI assistant. Type 'exit' to end the conversation.");
  p.log.info(
    "The assistant can use tools like calculator, time checking, and image generation."
  );

  // Start conversation loop
  let continueChat = true;
  console.log(""); // Empty line for spacing

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const messages: ModelMessage[] = [];

  const tools = getTools({
    executionType: "vercel-native",
    tools: [currentTimeTool, systemInfoTool, calculatorTool],
  });

  const agent = createConfigurableAgent({
    config: {
      type: "general",
      metadata: {
        type: "general",
        name: "",
        description: "",
        id: "",
        capabilities: [],
        icon: "",
        version: undefined,
        author: undefined,
      },
      tools: {
        custom: tools,
        mcp: {},
        builtin: {},
        agents: undefined,
      },
      id: "",
      version: "",
      prompts: {
        system: "",
        errorCorrection: undefined,
        fallback: undefined,
      },
      behavior: {
        responseFormat: "text",
        maxRetries: 0,
        validateResponse: false,
        emitEvents: undefined,
        timeout: undefined,
      },
    },
  });

  while (continueChat) {
    // Get user input
    const message = await textWithCancel(pc.blue("You: "));

    if (isCancel(message)) {
      continueChat = false;
      break;
    }

    // Check for exit commands
    if (message.toLowerCase() === "exit" || message.toLowerCase() === "quit") {
      continueChat = false;
      break;
    }

    // Send message with spinner
    const spinner = createSpinner();
    spinner.start("Thinking...");

    const responseFromAgent = await agent.act({
      messages: [
        ...messages,
        {
          role: "user",
          content: message,
        },
      ],
    });

    console.log("This is response from agent: ");
    console.log(responseFromAgent);

    // // action
    // const { response, text, steps, content } = await generateText({
    //   model: anthropic("claude-sonnet-4-20250514"),
    //   system: "You are a helpful assistant that is concise and to the point.",
    //   messages: [
    //     ...messages,
    //     {
    //       role: "user",
    //       content: message,
    //     },
    //   ],
    //   tools: availableTools,
    //   // IMPORTANT: this will do just one request to the model, but it will call the tools with execute
    //   // if the tools has execute function on them
    //   stopWhen: stepCountIs(1),
    //   prepareStep: async ({ stepNumber, steps, messages, model }) => {
    //     // Compress conversation history for longer loops
    //     console.log("stepNumber", stepNumber);
    //     console.log("Messages in step");
    //     console.log(messages);

    //     return {};
    //   },
    //   onStepFinish: () => {
    //     console.log("FINISH CURVA");
    //   },
    // });

    // console.log("Steps length");
    // console.log(steps.length);
    // console.log("steps content");
    // console.log(steps[0].response);

    // console.log("Whoile content");
    // console.log(content);

    // p.log.success(text);

    // messages.push({
    //   role: "user",
    //   content: message,
    // });

    // messages.push(...response.messages);

    console.log(
      "-------------------------------- current messages history ------------------------"
    );
    console.log(JSON.stringify(messages, null, 2));
    console.log(
      "-------------------------------- end messages history ------------------------"
    );

    spinner.stop();

    console.log(""); // Empty line for spacing
  }
}
