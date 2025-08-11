import * as p from "@clack/prompts";
import {
  createConfigurableAgent,
  createToolExecutor,
  createConversationLoop,
  baseLLMService,
  elevenlabsVoiceService,
  type Voice,
  type AudioResult,
  langfuseService,
} from "@mrck-labs/grid-core";
import { textWithCancel, isCancel } from "../utils/prompts.js";
import { VoiceProgressIndicator } from "../utils/voice-progress.js";
import { TerminalVoiceService } from "../services/terminal-voice.service.js";
import { calculatorTool, currentTimeTool } from "@mrck-labs/grid-tools";
import pc from "picocolors";
import { saveConversation } from "./helpers/conversation.helper.js";
import {
  registerTestMCPTools,
  type MCPClientType,
} from "./helpers/registerTestMcp.js";
import { getTools } from "../utils/tools.js";
import readline from "readline";

const sendUpdateOnProgress = async (message: any) => {
  // Handle different progress message types
  switch (message.type) {
    case "thinking":
      if (process.env.DEBUG) {
        p.log.step(pc.dim(`💭 ${message.content}`));
      }
      break;
    case "tool_execution":
      p.log.step(pc.yellow(`🔧 ${message.content}`));
      break;
    case "error":
      p.log.error(pc.red(`❌ ${message.content}`));
      break;
    case "speaking_start":
      // Voice progress will handle this
      break;
    case "listening_start":
      // Voice progress will handle this
      break;
    default:
      if (process.env.DEBUG) {
        p.log.info(pc.dim(`[${message.type}] ${message.content}`));
      }
  }
};

// Track if readline keypress events are already initialized
let readlineInitialized = false;

export async function exploreVoiceConversation(): Promise<void> {
  p.intro(pc.cyan("🎙️ Voice Conversation Mode"));
  p.log.info("Chat with an AI assistant using voice or text.");
  p.log.info("Press SPACE to start/stop recording, or type normally.");

  // Setup readline for key handling if not already done
  const wasRawMode = process.stdin.isRaw;
  if (process.stdin.isTTY) {
    if (!readlineInitialized) {
      readline.emitKeypressEvents(process.stdin);
      readlineInitialized = true;
    }
    process.stdin.setRawMode(true);

    // Increase max listeners to handle @clack/prompts adding its own listeners
    // This is expected behavior when using textWithCancel in a loop
    process.stdin.setMaxListeners(20);
  }

  // Check for ElevenLabs API key
  if (!process.env.ELEVENLABS_API_KEY) {
    p.log.error("ELEVENLABS_API_KEY not found in environment variables");
    p.outro("Please set your ElevenLabs API key in .env file");
    return;
  }

  // Initialize voice service
  let voiceService;
  try {
    voiceService = elevenlabsVoiceService({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
  } catch (error) {
    p.log.error(`Failed to initialize voice service: ${error}`);
    return;
  }

  // Check if voice service is available
  const voiceAvailable = await voiceService.isAvailable();
  if (!voiceAvailable) {
    p.log.error(
      "ElevenLabs service is not available. Please check your API key."
    );
    return;
  }

  // Initialize terminal voice service
  const terminalVoice = new TerminalVoiceService();
  const voiceProgress = new VoiceProgressIndicator();

  // Check audio capabilities
  const [canRecord, canPlay] = await Promise.all([
    terminalVoice.isRecordingAvailable(),
    terminalVoice.isPlaybackAvailable(),
  ]);

  if (!canRecord) {
    p.log.warning(
      "Microphone recording not available. Install 'sox' for voice input."
    );
    p.log.info("You can still use text input and hear voice responses.");
  }

  if (!canPlay) {
    p.log.warning("Audio playback not available. Responses will be text-only.");
  }

  // Select voice
  let selectedVoice: Voice | undefined;
  try {
    const voices = await voiceService.listVoices();
    if (voices.length > 0) {
      const voiceChoice = await p.select({
        message: "Select a voice for the assistant:",
        options: voices.slice(0, 10).map((v) => ({
          value: v,
          label: `${v.name} ${v.labels?.accent ? `(${v.labels.accent})` : ""}`,
        })),
      });

      if (isCancel(voiceChoice)) {
        p.cancel("Operation cancelled");
        return;
      }

      selectedVoice = voiceChoice as Voice;
      p.log.success(`Selected voice: ${selectedVoice.name}`);
    }
  } catch (error) {
    p.log.warning("Could not fetch voices. Using default voice.");
  }

  // Multiselect for MCP clients
  const mcpClientOptions = [
    {
      value: "figma" as MCPClientType,
      label: "Figma MCP Server (Design context)",
    },
    {
      value: "linear" as MCPClientType,
      label: "Linear MCP Server (Issue tracking)",
    },
  ];

  const selectedMcpClients = await p.multiselect({
    message: "Select MCP clients to initialize:",
    options: mcpClientOptions,
    required: false,
  });

  if (p.isCancel(selectedMcpClients)) {
    p.cancel("Operation cancelled");
    await terminalVoice.cleanup();
    return;
  }

  const {
    linearMcpTools,
    mcpTools,
    transformerMcpTools,
    transformedLinearMcpTools,
    clients,
  } = await registerTestMCPTools(selectedMcpClients as MCPClientType[]);

  p.log.info(
    pc.dim("💾 Conversation is automatically saved to conversation.json\n")
  );

  // Convert tools to new format
  const tools = getTools({
    executionType: "vercel-native",
    tools: [calculatorTool, currentTimeTool],
  });

  // Create tool executor for custom execution mode (if needed)
  const toolExecutor = createToolExecutor({
    onToolRegister: (tool) => {
      if (process.env.DEBUG) {
        p.log.success(`[ToolExecutor] ${tool.name} registered`);
      }
    },
  });

  // Register local tools for custom execution
  toolExecutor.registerTool(calculatorTool.withoutExecute);
  toolExecutor.registerTool(currentTimeTool.withoutExecute);

  // Register MCP tools if available
  for (const tool in transformerMcpTools) {
    toolExecutor.registerTool(transformerMcpTools[tool]);
  }

  for (const tool in transformedLinearMcpTools) {
    toolExecutor.registerTool(transformedLinearMcpTools[tool]);
  }

  // Create configurable agent with voice
  const agent = createConfigurableAgent({
    llmService: baseLLMService({
      toolExecutionMode: "vercel-native",
      langfuse: langfuseService,
    }),
    voiceService: voiceService,
    config: {
      id: "voice-conversation-agent",
      type: "general",
      prompts: {
        system: `You are a helpful, friendly assistant engaged in a voice conversation. 
You have access to various tools including calculator, current time, and potentially design/issue tracking tools.
Remember context from our conversation and refer back to previous topics when relevant.
Keep your responses concise and natural for voice interaction - avoid long lists or complex formatting.
When speaking, use a conversational tone as if talking to someone in person.`,
      },
      version: "1.0.0",
      metadata: {
        id: "voice-conversation-agent",
        type: "general",
        name: "Voice Conversational Agent",
        description: "An agent for interactive voice conversations",
        capabilities: ["general"],
        icon: "🎙️",
        version: "1.0.0",
      },
      tools: {
        builtin: {},
        custom: { ...tools, ...linearMcpTools },
        mcp: {},
        agents: [],
      },
      behavior: {
        maxRetries: 3,
        responseFormat: "text" as const,
        validateResponse: false,
        emitEvents: [],
      },
      voice: {
        enabled: true,
        voiceId: selectedVoice?.id,
        autoSpeak: canPlay,
        defaultOptions: {
          stability: 0.7,
          similarityBoost: 0.8,
          style: 0.5,
        },
      },
      orchestration: {},
    },
    // toolExecutor: toolExecutor, // Not needed for vercel-native mode
  });

  // Create conversation flow with progress streaming
  const conversation = createConversationLoop({
    agent,
    handlers: {
      manager: {
        onToolExecution: async (toolName, args, result) => {
          if (process.env.DEBUG) {
            console.log("  Tool:", toolName);
            console.log("  Args:", args);
            console.log("  Result:", result);
          }
        },
      },
    },
    onProgress: sendUpdateOnProgress,
    onMessage: async (response) => {
      // Display tool calls if any
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          p.log.step(pc.dim(`Using ${toolCall.toolName}...`));
        }
      }

      // Display the response
      if (response.content) {
        console.log(pc.green("\n🤖 Assistant:"), response.content);

        // Speak the response if voice is enabled
        if (
          agent.canSpeak &&
          agent.canSpeak() &&
          voiceEnabled &&
          selectedVoice
        ) {
          try {
            voiceProgress.setState("speaking");
            const audio = await agent.speak!(response.content, {
              voiceId: selectedVoice?.id,
            });
            await terminalVoice.playAudio(audio);
            voiceProgress.setState("idle");
          } catch (error) {
            voiceProgress.showError(`Voice synthesis failed: ${error}`);
          }
        }
      }
    },
    onError: async (error) => {
      p.log.error(`Error: ${error.message}`);
      voiceProgress.showError(error.message);
    },
  });

  p.log.success("Voice conversation ready!");
  voiceProgress.setState("idle");

  // Voice recording state
  let isRecording = false;
  let recordingControl: any = null;
  let voiceEnabled = canPlay; // Track voice output state
  let voiceMessageReceived = false;
  let voiceMessage = "";
  let isTyping = false; // Track if user has started typing

  // Setup keyboard handling for voice
  const handleKeypress = async (str: string, key: any) => {
    // Track any non-space character as typing
    if (str && str !== " " && !key.ctrl && !key.meta) {
      isTyping = true;
    }

    // Only trigger voice on space if not typing
    if (key && key.name === "space" && canRecord && !isTyping) {
      if (!isRecording) {
        // Start recording
        try {
          isRecording = true;
          voiceProgress.setState("listening");
          recordingControl = await terminalVoice.startRecording();
        } catch (error) {
          voiceProgress.showError(`Recording failed: ${error}`);
          isRecording = false;
        }
      } else if (recordingControl) {
        // Stop recording and transcribe
        try {
          voiceProgress.setState("processing");
          const audioInput = await recordingControl.stop();
          isRecording = false;

          // Transcribe the audio
          const transcription = await voiceService.transcribe(audioInput);

          if (transcription.text) {
            voiceProgress.showSuccess(`Transcribed: "${transcription.text}"`);

            // Set voice message and flag to be processed by main loop
            voiceMessage = transcription.text;
            voiceMessageReceived = true;
          } else {
            voiceProgress.showError("No speech detected");
          }
        } catch (error) {
          voiceProgress.showError(`Transcription failed: ${error}`);
        } finally {
          isRecording = false;
          recordingControl = null;
          voiceProgress.setState("idle");
        }
      }
    } else if (key && key.ctrl && key.name === "c") {
      // Handle Ctrl+C
      process.exit(0);
    }
  };

  if (process.stdin.isTTY && canRecord) {
    // Store the current number of listeners before adding ours
    const existingListenerCount = process.stdin.listenerCount("keypress");

    // Only add our listener if it's not already there
    // This prevents duplicates while preserving other listeners
    process.stdin.on("keypress", handleKeypress);
  }

  // Start conversation loop
  let continueChat = true;
  console.log(""); // Empty line for spacing

  // Welcome message
  if (agent.canSpeak && agent.canSpeak() && voiceEnabled) {
    try {
      voiceProgress.setState("speaking");
      const welcomeAudio = await agent.speak!(
        "Hello! I'm your voice assistant. You can speak to me by pressing the space bar, or type your messages. How can I help you today?",
        { voiceId: selectedVoice?.id }
      );
      await terminalVoice.playAudio(welcomeAudio);
      voiceProgress.setState("idle");
    } catch (error) {
      p.log.warning("Could not play welcome message");
    }
  }

  const waitForInput = async (): Promise<string | symbol> => {
    // Reset typing flag for new input
    isTyping = false;

    return new Promise(async (resolve) => {
      // Check if we already have a voice message
      if (voiceMessageReceived) {
        const msg = voiceMessage;
        voiceMessageReceived = false;
        voiceMessage = "";
        resolve(msg);
        return;
      }

      // Set up voice message handler
      const checkVoiceMessage = () => {
        if (voiceMessageReceived) {
          const msg = voiceMessage;
          voiceMessageReceived = false;
          voiceMessage = "";
          resolve(msg);
          return true;
        }
        return false;
      };

      // Poll for voice messages while waiting for text input
      const voiceCheckInterval = setInterval(() => {
        if (checkVoiceMessage()) {
          clearInterval(voiceCheckInterval);
        }
      }, 100);

      // Get text input
      try {
        const textInput = await textWithCancel(
          pc.blue("You (type or press SPACE for voice): ")
        );
        clearInterval(voiceCheckInterval);

        // Final check for voice message before resolving text
        if (!checkVoiceMessage()) {
          resolve(textInput);
        }
      } catch (error) {
        clearInterval(voiceCheckInterval);
        // If text input was cancelled, check for voice message one more time
        if (checkVoiceMessage()) {
          return;
        }
        // Otherwise, treat as cancellation
        resolve(Symbol.for("cancel"));
      }
    });
  };

  while (continueChat && conversation.isActive()) {
    // Wait for either text input or voice input
    const message = await waitForInput();

    if (isCancel(message)) {
      continueChat = false;
      break;
    }

    const messageStr = message as string;

    // Check for exit commands
    if (
      messageStr.toLowerCase() === "exit" ||
      messageStr.toLowerCase() === "quit"
    ) {
      continueChat = false;
      break;
    }

    // Special voice commands
    if (messageStr.toLowerCase() === "/voice off") {
      voiceEnabled = false;
      p.log.info("Voice output disabled");
      continue;
    }

    if (messageStr.toLowerCase() === "/voice on") {
      voiceEnabled = true;
      p.log.info("Voice output enabled");
      continue;
    }

    if (messageStr.toLowerCase() === "/voice list") {
      try {
        const voices = await voiceService.listVoices();
        p.log.info("Available voices:");
        voices.slice(0, 20).forEach((v) => {
          console.log(`  - ${v.name} (${v.id}) ${v.labels?.accent || ""}`);
        });
      } catch (error) {
        p.log.error("Could not fetch voices");
      }
      continue;
    }

    // Send the message
    const spinner = p.spinner();
    spinner.start("Thinking...");

    const result = await conversation.sendMessage(messageStr);

    spinner.stop();

    if (result.error) {
      p.log.error(`Failed to send message: ${result.error.message}`);
    }

    console.log(""); // Empty line for spacing
  }

  // Cleanup
  if (process.stdin.isTTY) {
    if (canRecord) {
      process.stdin.removeListener("keypress", handleKeypress);
    }
    // Restore original raw mode state
    process.stdin.setRawMode(wasRawMode || false);

    // Reset max listeners to default (10)
    process.stdin.setMaxListeners(10);
  }

  voiceProgress.cleanup();
  await terminalVoice.cleanup();

  // Save conversation history
  await saveConversation(conversation);

  p.outro("Voice conversation ended. Thank you!");

  // Cleanup MCP clients
  for (const client of Object.values(clients)) {
    try {
      await client?.close();
    } catch (error) {
      console.error("Error closing MCP client:", error);
    }
  }
}
