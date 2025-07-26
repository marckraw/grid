import * as p from "@clack/prompts";
import pc from "picocolors";
import type { LLMService, LLMServiceOptions, ChatMessage } from "@mrck-labs/grid-core";

/**
 * Custom LLM Service Implementation
 * This demonstrates how to create a custom LLM service that conforms to the LLMService interface.
 * In a real implementation, this would connect to your LLM provider of choice.
 */
export class CustomLLMService implements LLMService {
  private requestCount = 0;

  async runLLM(options: LLMServiceOptions): Promise<ChatMessage> {
    this.requestCount++;
    
    const { messages, tools, model, temperature, maxTokens } = options;
    const lastMessage = messages[messages.length - 1];
    
    // Log the request details
    p.log.info(pc.magenta("🎭 [CustomLLM] Request #" + this.requestCount));
    p.log.info(pc.dim("  Model: " + (model || "custom-model")));
    p.log.info(pc.dim("  Temperature: " + (temperature || 0.7)));
    p.log.info(pc.dim("  Max tokens: " + (maxTokens || "unlimited")));
    p.log.info(pc.dim("  Messages: " + messages.length));
    p.log.info(pc.dim("  Tools available: " + (tools?.length || 0)));
    
    if (lastMessage.content) {
      p.log.info(pc.dim("  Last message: " + lastMessage.content));
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock responses based on input
    let responseContent = "I'm a custom LLM implementation! ";
    
    if (lastMessage.content && typeof lastMessage.content === 'string') {
      const input = lastMessage.content.toLowerCase();
      
      if (input.includes('hello') || input.includes('hi')) {
        responseContent += "Hello there! I'm your custom LLM service demonstrating how to implement the LLMService interface.";
      } else if (input.includes('how are you')) {
        responseContent += "I'm functioning perfectly as a mock LLM! This demonstrates custom service integration.";
      } else if (input.includes('tool') && tools && tools.length > 0) {
        // Demonstrate tool calling
        p.log.info(pc.yellow("🔧 [CustomLLM] Generating tool call response"));
        
        return {
          role: "assistant",
          content: "I'll demonstrate a tool call for you.",
          toolCalls: [{
            toolCallId: `call_${Date.now()}`,
            toolName: tools[0].name || "example_tool",
            args: { example: "This is a mock tool call" }
          }]
        };
      } else if (input.includes('test')) {
        responseContent += "This is a test response from the custom LLM service. You can implement any logic here!";
      } else {
        responseContent += `I received your message: "${lastMessage.content}". In a real implementation, this would be processed by your chosen LLM.`;
      }
    }

    // Return the mock response
    const response: ChatMessage = {
      role: "assistant",
      content: responseContent,
      metadata: {
        customService: true,
        requestNumber: this.requestCount,
        processingTime: "500ms"
      }
    };

    p.log.info(pc.green("✅ [CustomLLM] Response generated"));
    
    return response;
  }

  async runLLMWithJSONResponse?(options: LLMServiceOptions): Promise<ChatMessage> {
    p.log.info(pc.blue("📋 [CustomLLM] JSON response requested"));
    
    // For demonstration, return a structured JSON response
    const jsonResponse = {
      status: "success",
      message: "This is a JSON response from the custom LLM",
      timestamp: new Date().toISOString(),
      requestCount: this.requestCount
    };

    return {
      role: "assistant",
      content: JSON.stringify(jsonResponse, null, 2)
    };
  }

  formatTools?(tools: any[]): any[] {
    p.log.info(pc.cyan("🛠️ [CustomLLM] Formatting " + tools.length + " tools"));
    
    // In a real implementation, you would format tools according to your LLM's requirements
    // For now, just return them as-is
    return tools;
  }

  async isAvailable?(): Promise<boolean> {
    p.log.info(pc.green("✅ [CustomLLM] Service is available"));
    return true;
  }
}

// Factory function to create the service
export const createCustomLLMService = (): LLMService => {
  p.log.success(pc.magenta("🎭 Custom LLM Service initialized"));
  return new CustomLLMService();
};