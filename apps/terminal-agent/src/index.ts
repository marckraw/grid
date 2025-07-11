#!/usr/bin/env node

import { createAgent } from "@mrck-labs/grid-agents";
import { createGrid } from "@mrck-labs/grid-core";
import { createWorkflow } from "@mrck-labs/grid-workflows";

async function main() {
  console.log("🤖 Grid Terminal Agent");
  console.log("======================");

  // Test that all packages work together
  const grid = createGrid({ apiKey: "test" });
  const agent = createAgent("agent-1", "Test Agent");
  const workflow = createWorkflow("workflow-1", "Test Workflow", [
    "step1",
    "step2",
  ]);

  console.log("✅ Grid initialized:", grid.version);
  console.log("✅ Agent created:", agent.name);
  console.log("✅ Workflow created:", workflow.name);
  console.log("\n🎉 All packages working correctly!");
}

main().catch(console.error);
