export interface MenuOption {
  value: string;
  label: string;
  hint?: string;
}

export interface Tool {
  name: string;
  description: string;
}

export interface ConfigOptions {
  apiKey: string;
  baseUrl: string;
  timeout: string;
}

export type CommandHandler = () => Promise<void>;

export interface CommandModule {
  name: string;
  description: string;
  handler: CommandHandler;
}