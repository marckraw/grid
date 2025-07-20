import { NextRequest, NextResponse } from "next/server";
import { createConfigurableAgent } from "@mrck-labs/grid-core";

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const agent = createConfigurableAgent({
      config: {
        id: "autonomous-agent",
        type: "general",
        prompts: {
          system: "You are a helpful assistant.",
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

    const response = await agent.act({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      response: response.content,
      agent: agent.id,
    });
  } catch (error) {
    console.error("Error in agent API:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Agent API is running. Send a POST request with a "prompt" field.',
    example: {
      prompt: "Tell me a joke about programming",
    },
  });
}
