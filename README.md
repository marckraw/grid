# Grid

A modern TypeScript library for LLM orchestration and agentic workflows.

## Docs

[https://grid-docs-six.vercel.app/](https://grid-docs-six.vercel.app/)

## Architecture

This is a monorepo built with:

- **Turborepo** for monorepo management
- **zshy** for library builds (bundler-free TypeScript compilation)
- **Changesets** for version management and releases
- **GitHub Actions** for automated CI/CD
- **Biome** for linting and formatting
- **pnpm** for package management

## Packages

- `@mrck-labs/grid-core` - Core primitives and configuration
- `@mrck-labs/grid-agents` - Agent orchestration and management
- `@mrck-labs/grid-workflows` - Workflow definition and execution
- `@mrck-labs/grid-examples` - Framework integration examples

## Applications

- `terminal-agent` - Terminal application showcasing Grid features

## Development

### Setup

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Development

```bash
pnpm dev
```

### Testing

```bash
pnpm test
```

### Linting

```bash
pnpm lint
```

## 🚀 Automated Releases

**Your releases are fully automated!**

### Beta Releases (develop branch)

```bash
# 1. Create feature branch from develop
git checkout develop
git checkout -b feature/my-feature

# 2. Make changes and add changeset
pnpm changeset

# 3. Create PR to develop
# When merged → CI automatically publishes beta! 🎉
```

### Stable Releases (master branch)

```bash
# Create PR from develop to master
# When merged → CI automatically publishes stable! 🎉
```

### Installation

```bash
# Install latest stable
npm install @mrck-labs/grid-core

# Install latest beta
npm install @mrck-labs/grid-core@beta
```

## 📋 One-Time Setup

### GitHub Repository Secrets

Add to your GitHub repository (Settings → Secrets and variables → Actions):

- **`NPM_TOKEN`**: Your npm publish token

### Create develop branch

```bash
git checkout -b develop
git push origin develop
```

📖 **[Complete Release Guide](./RELEASE_GUIDE.md)** - Detailed automated release instructions

## Features

- **Dual ESM/CJS builds** - Compatible with all Node.js environments
- **Framework agnostic** - Works with Hono, Express, Fastify, etc.
- **Type-safe** - Full TypeScript support with Zod validation
- **Modular** - Use only what you need
- **Automated releases** - CI/CD handles beta and stable releases

## License

MIT
