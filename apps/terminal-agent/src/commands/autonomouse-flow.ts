import * as p from "@clack/prompts";
import { createAgent } from "@mrck-labs/grid-agents";
import {
  selectWithCancel,
  textWithCancel,
  confirmWithCancel,
  isCancel,
} from "../utils/prompts.js";
import { withSpinner, simulateWork } from "../utils/spinners.js";
import type { MenuOption } from "../types/index.js";

export async function exploreAutonomousFlow(): Promise<void> {}
