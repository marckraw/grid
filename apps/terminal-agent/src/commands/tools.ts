import * as p from "@clack/prompts";
import { textWithCancel, isCancel } from "../utils/prompts.js";
import { withSpinner, simulateWork } from "../utils/spinners.js";
import type { Tool } from "../types/index.js";

export async function exploreToolUsage(): Promise<void> {
  p.note("Explore how agents can use tools to extend their capabilities.", "Tool Usage");

  const tools: Tool[] = [
    { name: "Calculator", description: "Perform mathematical calculations" },
    { name: "Web Search", description: "Search the internet for information" },
    { name: "Code Executor", description: "Run code snippets safely" },
    { name: "File Reader", description: "Read and analyze files" },
  ];

  const selectedTools = await p.multiselect({
    message: "Select tools for the agent to use:",
    options: tools.map(tool => ({
      value: tool.name,
      label: tool.name,
      hint: tool.description,
    })),
    required: false,
  });

  if (p.isCancel(selectedTools)) {
    p.cancel("Tool selection cancelled");
    return;
  }

  if (selectedTools && Array.isArray(selectedTools) && selectedTools.length > 0) {
    p.log.success(`Agent equipped with: ${selectedTools.join(", ")}`);

    const task = await textWithCancel(
      "What task requires these tools?",
      "e.g., Calculate the square root of 144"
    );

    if (isCancel(task)) return;

    await withSpinner(
      "Agent is working with tools...",
      async () => simulateWork(2000),
      "Task completed!"
    );

    p.note(
      `Task: ${String(task)}\nTools used: ${selectedTools.join(", ")}\n\nResult: Tool execution results would appear here.`,
      "Tool Execution Summary"
    );
  }
}