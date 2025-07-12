# Grid Terminal Agent

An interactive CLI for exploring Grid's agentic primitives and capabilities.

## Features

- 🤖 **Agent Primitives**: Explore basic agents, memory-enabled agents, and reasoning agents
- 🔄 **Workflow Builder**: Create multi-step workflows interactively
- 💬 **Conversation Mode**: Interactive chat with agents
- 🛠️ **Tool Usage**: Experiment with tool-calling capabilities
- 👥 **Agent Collaboration**: Set up multiple agents working together
- ⚙️ **Configuration**: Manage Grid settings

## Installation

```bash
pnpm install
```

## Configuration

The terminal agent uses environment variables for API keys and configuration.

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your API keys:
```env
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key  # optional
GRID_API_KEY=your-grid-api-key           # optional
```

3. (Optional) Customize other settings like timeout, retries, and model defaults.

## Usage

### Development
```bash
pnpm dev
```

### Production
```bash
pnpm build
pnpm start
```

## Interactive Menu

The terminal agent provides an interactive menu with the following options:

1. **Agent Primitives**: Create and test different types of agents
2. **Workflow Primitives**: Build and execute multi-step workflows
3. **Conversation Mode**: Have interactive conversations with agents
4. **Tool Usage**: Equip agents with various tools and test their capabilities
5. **Agent Collaboration**: Create multiple agents that work together on tasks
6. **Configuration**: View and modify Grid settings

## Keyboard Shortcuts

- `Ctrl+C`: Cancel current operation and return to menu
- Arrow keys: Navigate through options
- Enter: Select option
- Type "exit" in conversation mode to return to main menu

## Built with

- [@clack/prompts](https://github.com/natemoo-re/clack) - Beautiful CLI prompts
- [picocolors](https://github.com/alexeyraspopov/picocolors) - Terminal colors
- Grid packages for agent orchestration