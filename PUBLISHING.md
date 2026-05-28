# Publishing @orangehealth/jarvis-mcp to npm

## Prerequisites

1. npm account with access to the `@orangehealth` organization
2. Node.js 18+ installed
3. npm CLI logged in

---

## One-time Setup

### 1. Create the npm organization (if not exists)

Go to https://www.npmjs.com/org/create and create the `orangehealth` organization.

### 2. Login to npm

```bash
npm login
```

Follow the browser prompt to authenticate (security key or 2FA).

### 3. Verify you're logged in

```bash
npm whoami
# Should show your npm username
```

### 4. Update package name

In `package.json`, change the name to use the org scope:

```json
{
  "name": "@orangehealth/jarvis-mcp",
  ...
}
```

---

## Publishing Steps

### 1. Navigate to the project

```bash
cd /Users/abhishekgupta/code/jarvis/jarvis-mcp
```

### 2. Install dependencies (if needed)

```bash
npm install
```

### 3. Build the project

```bash
npm run build
```

### 4. Verify the build

```bash
ls dist/
# Should show: index.js, server.js, client.js, cache.js, watcher.js, workspace.js (+ .d.ts and .map files)
```

### 5. Bump version (choose one)

```bash
# Patch release (0.2.1 → 0.2.2) - bug fixes
npm version patch

# Minor release (0.2.1 → 0.3.0) - new features
npm version minor

# Major release (0.2.1 → 1.0.0) - breaking changes
npm version major

# Or set explicit version
npm version 1.0.0
```

### 6. Publish

```bash
npm publish --access public
```

- Press ENTER when prompted to open browser
- Authenticate with your security key
- Wait for "Published" confirmation

### 7. Verify publication

```bash
npm view @orangehealth/jarvis-mcp
```

---

## After Publishing

### Update references in jarvis-ai-web

In `src/app/settings/api-keys/page.tsx` and `src/components/SettingsPanel.tsx`, update the package name:

```typescript
// Old
args: ['-y', '@abhishek-0118/jarvis-mcp']

// New
args: ['-y', '@orangehealth/jarvis-mcp']
```

### Update README.md

Update installation instructions:

```bash
npm install -g @orangehealth/jarvis-mcp
```

### Update users

Users should run:

```bash
npm install -g @orangehealth/jarvis-mcp@latest
```

---

## Quick Publish Commands (copy-paste)

```bash
cd /Users/abhishekgupta/code/jarvis/jarvis-mcp
npm run build
npm version patch
npm publish --access public
npm view @orangehealth/jarvis-mcp
```

---

## Troubleshooting

### Error: 403 Forbidden - You do not have permission

You're not a member of the `@orangehealth` npm organization. Ask an admin to add you, or create the org.

### Error: 404 Not Found on install

The package was published as private. Fix with:

```bash
npm access set status=public @orangehealth/jarvis-mcp
```

### Error: Cannot publish over previously published version

Bump the version first:

```bash
npm version patch
npm publish --access public
```

### Error: EOTP / requires one-time password

Your account uses 2FA. The browser should open for security key auth. If it doesn't:

```bash
npm publish --access public --auth-type=web
```
