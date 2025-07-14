#!/usr/bin/env node

import * as p from "@clack/prompts";
import { runCLI } from "./cli.js";

runCLI().catch((error: unknown) => {
  p.cancel("An error occurred:");
  console.error(error);
  process.exit(1);
});