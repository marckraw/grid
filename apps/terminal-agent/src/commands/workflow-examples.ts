import * as p from "@clack/prompts";
import pc from "picocolors";
import { createWorkflow } from "@mrck-labs/grid-workflows";
import {
  createConfigurableAgent,
  baseLLMService,
  langfuseService,
} from "@mrck-labs/grid-core";
import { textWithCancel, isCancel } from "../utils/prompts.js";

export async function exploreWorkflowExamples(): Promise<void> {
  p.intro(pc.cyan("🔄 Workflow Examples"));
  p.log.info("Demonstrating workflow patterns with Grid primitives");

  // Create a simple customer support triage workflow
  const workflow = createWorkflow({
    name: "Customer Support Triage",
    description: "Routes customer issues to appropriate handlers",
    managerOptions: {
      historyOptions: {
        systemPrompt: "You are a customer support triage assistant.",
      },
    },
  });

  // Create agents for different steps
  const analysisAgent = createConfigurableAgent({
    llmService: baseLLMService({ langfuse: langfuseService }),
    config: {
      id: "analysis-agent",
      type: "general",
      version: "1.0.0",
      prompts: {
        system: `Analyze customer issues and categorize them. 
        Categories: technical, billing, general
        Respond with just the category name.`,
      },
      metadata: {
        id: "analysis-agent",
        type: "general",
        name: "Analysis Agent",
        description: "Analyzes and categorizes issues",
        capabilities: ["general"],
        version: "1.0.0",
        icon: "🔍",
      },
      tools: {
        builtin: [],
        custom: [],
        mcp: [],
      },
      behavior: {
        maxRetries: 3,
        responseFormat: "text",
        validateResponse: true,
      },
    },
  });

  const technicalAgent = createConfigurableAgent({
    llmService: baseLLMService({ langfuse: langfuseService }),
    config: {
      id: "technical-agent",
      type: "general",
      version: "1.0.0",
      prompts: {
        system:
          "You are a technical support specialist. Provide detailed technical solutions.",
      },
      metadata: {
        id: "technical-agent",
        type: "general",
        name: "Technical Agent",
        description: "Handles technical issues",
        capabilities: ["general"],
        version: "1.0.0",
        icon: "🔧",
      },
      tools: {
        builtin: [],
        custom: [],
        mcp: [],
      },
      behavior: {
        maxRetries: 3,
        responseFormat: "text",
        validateResponse: true,
      },
    },
  });

  // Define workflow steps
  workflow
    .step("analyze")
    .llm(analysisAgent)
    .then((category) => {
      // Route based on category
      if (category.toLowerCase().includes("technical")) {
        return "handleTechnical";
      }
      if (category.toLowerCase().includes("billing")) {
        return "handleBilling";
      }
      return "handleGeneral";
    });

  workflow
    .step("handleTechnical")
    .llm(technicalAgent)
    .then(() => "logResolution");

  workflow
    .step("handleBilling")
    .function(async (input, { setState, addMessage }) => {
      await addMessage("Processing billing issue...");
      await setState("resolution.type", "billing");
      await setState("resolution.action", "escalate_to_billing_team");
      return {
        message:
          "Your billing issue has been escalated to our billing team. They will contact you within 24 hours.",
        escalated: true,
      };
    })
    .then(() => "logResolution");

  workflow
    .step("handleGeneral")
    .function(async (input, { setState }) => {
      await setState("resolution.type", "general");
      return {
        message:
          "Thank you for contacting support. A representative will assist you shortly.",
        queued: true,
      };
    })
    .then(() => "logResolution");

  workflow.step("logResolution").function(async (resolution, { getState }) => {
    const state = getState();
    console.log(pc.dim("\n📋 Resolution logged:"));
    console.log(pc.dim(`  Type: ${state["resolution.type"] || "unknown"}`));
    console.log(pc.dim(`  Message: ${resolution.message}`));
    return resolution;
  });

  // Get user input
  const issue = await textWithCancel("Describe your issue:");

  if (isCancel(issue)) {
    p.cancel("Workflow cancelled");
    return;
  }

  const spinner = p.spinner();
  spinner.start("Processing your request through the workflow...");

  try {
    // Run the workflow
    const result = await workflow.run("analyze", issue);

    spinner.stop("Workflow completed!");

    // Display results
    p.log.success(pc.green("\n✅ Workflow Result:"));
    console.log(
      pc.cyan(`Final output: ${JSON.stringify(result.finalResult, null, 2)}`)
    );
    console.log(
      pc.dim(`\nExecuted steps: ${result.executedSteps.join(" → ")}`)
    );
    console.log(pc.dim(`Duration: ${result.duration}ms`));

    // Show conversation history
    const showHistory = await p.confirm({
      message: "Would you like to see the conversation history?",
      initialValue: false,
    });

    if (showHistory && !isCancel(showHistory)) {
      console.log(pc.cyan("\n📜 Conversation History:"));
      const messages = workflow.primitives.history.getMessages();
      messages.forEach((msg, idx) => {
        console.log(pc.dim(`${idx + 1}. [${msg.role}]: ${msg.content}`));
      });
    }

    // Show workflow state
    const showState = await p.confirm({
      message: "Would you like to see the workflow state?",
      initialValue: false,
    });

    if (showState && !isCancel(showState)) {
      console.log(pc.cyan("\n🔍 Workflow State:"));
      console.log(JSON.stringify(result.state, null, 2));
    }
  } catch (error) {
    spinner.stop("Workflow failed");
    p.log.error(
      pc.red(`Error: ${error instanceof Error ? error.message : String(error)}`)
    );
  }

  p.outro(pc.green("Workflow example completed!"));
}
