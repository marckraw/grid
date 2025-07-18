import { NextRequest } from "next/server";
import {
  createConfigurableAgent,
  createToolExecutor,
  createConversationFlow,
  type ConversationFlow,
  type ProgressMessage,
} from "@mrck-labs/grid-core";
import { calculatorTool } from "../../tools/calculator.tool";
import { currentTimeTool } from "../../tools/current-time.tool";

// Store conversations in memory (in production, use a database)
const conversations = new Map<string, ConversationFlow>();

// Store conversation progress handlers
type ProgressHandler = (progress: ProgressMessage) => void;
const progressHandlers = new Map<string, ProgressHandler>();

// Helper to get or create conversation
function getConversation(sessionId: string, onProgress?: ProgressHandler): ConversationFlow {
  if (!conversations.has(sessionId)) {
    // Create tool executor and register tools
    const toolExecutor = createToolExecutor();
    toolExecutor.registerTool(calculatorTool);
    toolExecutor.registerTool(currentTimeTool);

    // Create configurable agent
    const agent = createConfigurableAgent({
      config: {
        id: "web-conversation-agent",
        type: "general",
        prompts: {
          system: `You are a helpful, friendly assistant engaged in a conversation. 
You have access to a calculator, can check the current time, and can generate images.
Remember context from our conversation and refer back to previous topics when relevant.
Be concise but friendly in your responses.`,
        },
        version: "1.0.0",
        metadata: {
          id: "web-conversation-agent",
          type: "general",
          name: "Web Conversational Agent",
          description: "An agent for interactive web conversations",
          capabilities: ["general"],
          icon: "💬",
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
      additionalTools: {
        local: [calculatorTool, currentTimeTool],
      },
      toolExecutor: toolExecutor,
    });

    // Create conversation flow with progress handler if provided
    const conversation = createConversationFlow({
      agent,
      toolExecutor,
      maxIterations: 50,
      enableProgressStreaming: true,
      onProgress: (progress) => {
        const handler = progressHandlers.get(sessionId);
        if (handler) handler(progress);
      },
    });

    conversations.set(sessionId, conversation);
  }

  // Update progress handler if provided
  if (onProgress) {
    progressHandlers.set(sessionId, onProgress);
  }

  return conversations.get(sessionId)!;
}

// Server-Sent Events endpoint
export async function POST(request: NextRequest) {
  const { message, sessionId } = await request.json();

  if (!message || !sessionId) {
    return new Response(
      JSON.stringify({ error: "Message and sessionId are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Set up progress handler
      const progressHandler = (progress: ProgressMessage) => {
        console.log("[SSE] Sending progress:", progress.type, progress.content);
        const data = `data: ${JSON.stringify({
          type: "progress",
          progress,
        })}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      // Get conversation with progress handler
      const conversation = getConversation(sessionId, progressHandler);

      try {
        console.log("[SSE] Sending message:", message);
        // Send the message
        const result = await conversation.sendMessageWithToolResolution(message);
        
        console.log("[SSE] Got result:", result);
        // Send the assistant's response
        if (result.response) {
          console.log("[SSE] Sending response message:", result.response);
          const data = `data: ${JSON.stringify({
            type: "message",
            message: result.response,
          })}\n\n`;
          controller.enqueue(encoder.encode(data));
        } else {
          console.log("[SSE] No response in result");
        }

        // Send completion event
        const data = `data: ${JSON.stringify({ type: "done" })}\n\n`;
        controller.enqueue(encoder.encode(data));
      } catch (error) {
        const data = `data: ${JSON.stringify({
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })}\n\n`;
        controller.enqueue(encoder.encode(data));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Get conversation history
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "SessionId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const conversation = conversations.get(sessionId);
  if (!conversation) {
    return new Response(JSON.stringify({ messages: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = conversation.getMessages();
  const summary = conversation.getSummary();

  return new Response(JSON.stringify({ messages, summary }), {
    headers: { "Content-Type": "application/json" },
  });
}

// Reset conversation
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "SessionId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  conversations.delete(sessionId);

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
