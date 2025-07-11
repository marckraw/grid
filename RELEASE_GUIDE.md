# Release Guide

This guide explains how to manage releases in the Grid monorepo using changesets with automated CI/CD.

## 🚀 Automated Release Strategy

**Your workflow is now fully automated!**

- **`develop`** → Automatically publishes beta releases
- **`master`** → Automatically publishes stable releases

## Branch Strategy

- **`develop`**: Beta releases (1.0.0-beta.1, 1.0.0-beta.2, 1.1.0-beta.1)
- **`master`**: Stable releases (1.0.0, 1.1.0, 1.2.0)

## 🔧 One-Time Setup

### 1. GitHub Repository Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- **`NPM_TOKEN`**: Your npm publish token

  ```bash
  # Create npm token with publish permissions
  npm login
  npm token create --type=automation
  ```

- **`GITHUB_TOKEN`**: Automatically provided by GitHub Actions (no setup needed)

### 2. Create develop branch

```bash
git checkout -b develop
git push origin develop
```

## 🔄 Daily Workflow

### For Beta Releases (develop branch)

```bash
# 1. Create feature branch from develop
git checkout develop
git checkout -b feature/my-awesome-feature

# 2. Make your changes
# ... code changes ...

# 3. Add changeset
pnpm changeset

# 4. Commit and push
git add .
git commit -m "feat: add awesome feature"
git push origin feature/my-awesome-feature

# 5. Create PR to develop
# When PR is merged → CI automatically publishes beta! 🎉
```

### For Stable Releases (master branch)

```bash
# 1. Create PR from develop to master
# When PR is merged → CI automatically publishes stable! 🎉

# That's it! No manual steps needed.
```

## 🤖 What CI Does Automatically

### On `develop` branch push:

1. ✅ Installs dependencies
2. ✅ Builds packages
3. ✅ Enters prerelease mode (`beta`)
4. ✅ Creates/updates changesets
5. ✅ Publishes to npm with `@beta` tag
6. ✅ Updates versions in repo

### On `master` branch push:

1. ✅ Installs dependencies
2. ✅ Builds packages
3. ✅ Exits prerelease mode
4. ✅ Creates/updates changesets
5. ✅ Publishes to npm with `@latest` tag
6. ✅ Updates versions in repo

## 📦 Installation Examples

```bash
# Install latest stable (from master)
npm install @grid/core

# Install latest beta (from develop)
npm install @grid/core@beta

# Install specific version
npm install @grid/core@1.2.0
npm install @grid/core@1.3.0-beta.1
```

## 🛠️ Local Development Commands

### Check release status

```bash
pnpm changeset status
```

### Manual beta release (if needed)

```bash
pnpm release:beta
```

### Manual stable release (if needed)

```bash
pnpm release:stable
```

### Check what would be published

```bash
pnpm release:dry-run
```

## 📋 Changeset Best Practices

### Good Changeset Descriptions

```markdown
# 🎯 Good Examples

- Add support for OpenAI GPT-4 Turbo model
- Fix memory leak in agent orchestration loop
- BREAKING: Remove deprecated `createLegacyAgent` function
- Improve error handling in workflow execution

# ❌ Bad Examples

- Update stuff
- Fix bug
- Changes
- Misc improvements
```

### Changeset Types

- **`major`**: Breaking changes (1.0.0 → 2.0.0)
- **`minor`**: New features (1.0.0 → 1.1.0)
- **`patch`**: Bug fixes (1.0.0 → 1.0.1)

## 🔍 Monitoring Releases

### GitHub Actions

- Check the "Actions" tab in your repo
- Look for "Release Beta" and "Release Stable" workflows
- Green ✅ = successful release
- Red ❌ = failed release (check logs)

### npm Registry

```bash
# Check published versions
npm view @grid/core versions --json

# Check latest versions
npm view @grid/core dist-tags --json
```

## 🚨 Troubleshooting

### CI Workflow Failed

1. Check GitHub Actions logs
2. Common issues:
   - Missing `NPM_TOKEN` secret
   - No changesets found
   - Build failures

### Package Not Published

```bash
# Check if changesets exist
ls -la .changeset/

# Check CI logs in GitHub Actions
# Look for "No changesets found" message
```

### Wrong Version Published

```bash
# Check current prerelease status
cat .changeset/pre.json

# If file exists, you're in prerelease mode
# If file doesn't exist, you're in stable mode
```

### Emergency Manual Release

```bash
# If CI is broken, you can still release manually:

# For beta:
git checkout develop
pnpm changeset pre enter beta
pnpm changeset
pnpm version-packages
pnpm release --tag beta

# For stable:
git checkout master
pnpm changeset pre exit
pnpm changeset
pnpm version-packages
pnpm release
```

## 🔮 Advanced Scenarios

### Hotfix Release

```bash
# 1. Create hotfix branch from master
git checkout master
git checkout -b hotfix/critical-bug-fix

# 2. Make fix and add changeset
pnpm changeset

# 3. Merge directly to master
git checkout master
git merge hotfix/critical-bug-fix
git push origin master

# 4. CI automatically publishes stable hotfix
```

### Skip Release

```bash
# Use conventional commit format to skip CI
git commit -m "docs: update readme [skip ci]"
```

## 📖 Quick Reference

### Your Simple Workflow

```bash
# 1. Feature development
git checkout develop
git checkout -b feature/my-feature
# ... make changes ...
pnpm changeset
git commit -m "feat: my feature"
git push origin feature/my-feature

# 2. Create PR to develop → merges → beta published! 🎉

# 3. When ready for stable:
# Create PR from develop to master → merges → stable published! 🎉
```

### Emergency Commands

```bash
# Check release status
pnpm changeset status

# Manual beta release
pnpm release:beta

# Manual stable release
pnpm release:stable
```

That's it! Your releases are now fully automated. Just focus on building great features and let CI handle the rest! 🚀
