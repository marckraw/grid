/**
 * @grid/workflows - Workflow orchestration primitives
 */

export const VERSION = "0.0.0";

export type Workflow = {
  id: string;
  name: string;
  steps: string[];
};

export const createWorkflow = (
  id: string,
  name: string,
  steps: string[] = [],
): Workflow => {
  return { id, name, steps };
};
