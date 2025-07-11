# Setup Guide

Quick setup instructions for contributors to the Grid project.

## Prerequisites

- Node.js 20+
- pnpm 8+
- Git

## Initial Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd grid
pnpm install
```

### 2. Build Everything

```bash
pnpm build
```

### 3. Test the Setup

```bash
cd apps/terminal-agent
pnpm dev
```

You should see:

```
🤖 Grid Terminal Agent
======================
✅ Grid initialized: 0.0.0
✅ Agent created: Test Agent
✅ Workflow created: Test Workflow
🎉 All packages working correctly!
```

## 🔧 For Repository Owner

### GitHub Repository Setup

1. **Create repository secrets** (Settings → Secrets and variables → Actions):

   - `NPM_TOKEN`: Your npm automation token

   ```bash
   npm login
   npm token create --type=automation
   ```

2. **Create develop branch**:

   ```bash
   git checkout -b develop
   git push origin develop
   ```

3. **Set default branch** (optional):
   - Go to GitHub → Settings → Branches
   - Change default branch to `develop`

### npm Organization Setup

1. **Create npm organization** (optional):

   ```bash
   npm org create @your-org-name
   ```

2. **Update package names** in all `package.json` files:
   ```json
   {
     "name": "@your-org-name/core"
   }
   ```

## 🔄 Development Workflow

### For Contributors

```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/my-awesome-feature

# 2. Make changes
# ... code changes ...

# 3. Add changeset
pnpm changeset

# 4. Test your changes
pnpm build
pnpm lint
pnpm test

# 5. Commit and push
git add .
git commit -m "feat: add awesome feature"
git push origin feature/my-awesome-feature

# 6. Create PR to develop
```

### For Maintainers

```bash
# Merge feature PRs to develop → automatic beta release
# Merge develop to master → automatic stable release
```

## 🛠️ Useful Commands

```bash
# Check what would be released
pnpm release:status

# Run all builds
pnpm build

# Run all tests
pnpm test

# Run all linters
pnpm lint

# Manual beta release (if CI fails)
pnpm release:beta

# Manual stable release (if CI fails)
pnpm release:stable
```

## 🚨 Troubleshooting

### Build Failures

```bash
# Clean install
rm -rf node_modules
pnpm install

# Force rebuild
pnpm build --force
```

### TypeScript Errors

```bash
# Check TypeScript config
pnpm tsc --noEmit

# Update types
pnpm add -D @types/node@latest
```

### Changeset Issues

```bash
# Check changeset status
pnpm changeset status

# List all changesets
ls -la .changeset/
```

## 📁 Project Structure

```
grid/
├── .github/workflows/     # CI/CD workflows
├── .changeset/           # Changeset configuration
├── packages/             # Library packages
│   ├── core/            # Core primitives
│   ├── agents/          # Agent orchestration
│   ├── workflows/       # Workflow management
│   └── examples/        # Framework integrations
├── apps/                # Applications
│   └── terminal-agent/  # Terminal showcase app
├── README.md           # Main documentation
├── RELEASE_GUIDE.md    # Release instructions
└── SETUP.md           # This file
```

## 🎯 Next Steps

1. **Read the docs**: [Release Guide](./RELEASE_GUIDE.md)
2. **Explore packages**: Check out `packages/*/src/index.ts`
3. **Run the demo**: `cd apps/terminal-agent && pnpm dev`
4. **Make your first contribution**: Add a changeset with `pnpm changeset`

Happy coding! 🚀
