#!/usr/bin/env node

import * as p from "@clack/prompts";
import { runCLI } from "./cli.js";
import { conversationWithMemory } from "./commands/conversation-with-memory.js";

// Simple argument parsing
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (command === "conversation-with-memory") {
    // Run the memory conversation command directly
    await conversationWithMemory();
  } else if (command) {
    p.log.error(`Unknown command: ${command}`);
    p.log.info("Available commands: conversation-with-memory");
    process.exit(1);
  } else {
    // Run the interactive CLI
    await runCLI();
  }
}

main().catch((error: unknown) => {
  p.cancel("An error occurred:");
  console.error(error);
  process.exit(1);
});