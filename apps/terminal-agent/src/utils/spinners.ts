import * as p from "@clack/prompts";

export function createSpinner() {
  return p.spinner();
}

export async function withSpinner<T>(
  message: string,
  action: () => Promise<T>,
  successMessage?: string
): Promise<T> {
  const spinner = createSpinner();
  spinner.start(message);
  
  try {
    const result = await action();
    spinner.stop(successMessage || "Done!");
    return result;
  } catch (error) {
    spinner.stop("Failed!");
    throw error;
  }
}

export async function simulateWork(duration: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, duration));
}