/**
 * Simple Langfuse integration example
 *
 * This shows how to use Langfuse tracing with Grid's LLM service.
 */

import {
  baseLLMService,
  endTrace,
  shutdownLangfuse,
  startTrace,
} from "../index.js";

async function example() {
  // Create LLM service with Langfuse enabled
  const llmService = baseLLMService({
    defaultModel: "gpt-4",
    langfuse: {
      enabled: true,
      // API keys will be loaded from environment variables:
      // LANGFUSE_SECRET_KEY
      // LANGFUSE_PUBLIC_KEY
      // LANGFUSE_BASEURL (optional)
    },
  });

  // Start a trace for the conversation session
  const sessionId = `example-session-${Date.now()}`;
  const traceContext = startTrace("example-conversation", sessionId);

  if (traceContext) {
    console.log(`Started trace with session: ${sessionId}`);
  }

  try {
    // Make a simple LLM call - it will be automatically traced to Langfuse
    const response = await llmService.runLLM({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        {
          role: "user",
          content: "What is the capital of France?",
        },
      ],
      temperature: 0.7,
    });

    console.log("Response:", response.content);

    // Make a JSON response call
    const jsonResponse = await llmService.runLLMWithJSONResponse({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: "List 3 programming languages as a JSON array",
        },
      ],
    });

    console.log("JSON Response:", jsonResponse.content);
  } finally {
    // End the trace
    endTrace();

    // Ensure all traces are sent before exiting
    await shutdownLangfuse();
    console.log("Langfuse shutdown complete");

    if (traceContext) {
      console.log(
        `View your trace in Langfuse dashboard (session: ${sessionId})`,
      );
    }
  }
}

// Run the example
if (require.main === module) {
  console.log("Running simple Langfuse example...");
  example()
    .then(() => console.log("Example completed!"))
    .catch(console.error);
}
