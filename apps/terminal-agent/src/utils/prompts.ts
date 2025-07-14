import * as p from "@clack/prompts";
import type { MenuOption } from "../types/index.js";

export async function selectWithCancel<T = string>(
  message: string,
  options: MenuOption[]
): Promise<T | symbol> {
  const result = await p.select({
    message,
    options,
  }) as T | symbol;

  if (p.isCancel(result)) {
    p.cancel("Operation cancelled");
    return result;
  }

  return result;
}

export async function textWithCancel(
  message: string,
  placeholder?: string,
  defaultValue?: string
): Promise<string | symbol> {
  const result = await p.text({
    message,
    placeholder,
    defaultValue,
  });

  if (p.isCancel(result)) {
    p.cancel("Operation cancelled");
    return result;
  }

  return result;
}

export async function confirmWithCancel(
  message: string,
  initialValue = false
): Promise<boolean | symbol> {
  const result = await p.confirm({
    message,
    initialValue,
  });

  if (p.isCancel(result)) {
    p.cancel("Operation cancelled");
    return result;
  }

  return result;
}

export function isCancel(value: unknown): value is symbol {
  return p.isCancel(value);
}