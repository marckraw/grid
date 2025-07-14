import * as p from "@clack/prompts";
import { createWorkflow } from "@mrck-labs/grid-workflows";
import { textWithCancel, confirmWithCancel, isCancel } from "../utils/prompts.js";
import { createSpinner, simulateWork } from "../utils/spinners.js";

export async function exploreWorkflowPrimitives(): Promise<void> {
  const steps: string[] = [];
  let addingSteps = true;

  p.note("Let's build a workflow step by step!", "Workflow Builder");

  while (addingSteps) {
    const stepName = await textWithCancel(
      `Step ${steps.length + 1} name:`,
      "e.g., Data Processing"
    );

    if (isCancel(stepName)) return;

    steps.push(String(stepName));

    const continueAdding = await confirmWithCancel(
      "Add another step?",
      true
    );
    
    if (isCancel(continueAdding)) return;
    
    addingSteps = continueAdding === true;
  }

  const workflow = createWorkflow(
    `workflow-${Date.now()}`,
    "Custom Workflow",
    steps
  );

  const spinner = createSpinner();
  spinner.start("Executing workflow...");

  for (const step of workflow.steps) {
    await simulateWork(1000);
    spinner.message(`Running: ${step}`);
  }

  spinner.stop("Workflow completed!");

  p.note(
    `Workflow: ${workflow.name}\nSteps executed: ${workflow.steps.join(" → ")}`,
    "Workflow Summary"
  );
}