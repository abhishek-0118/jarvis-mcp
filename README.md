# Jarvis MCP

MCP (Model Context Protocol) server that connects [Cursor](https://cursor.com) to the **Jarvis** code-intelligence engine.

Jarvis uses a hybrid approach — BM25, AST symbol extraction, dependency graphs (NetworkX), and rerankers — to provide deep codebase context across your organisation's repositories.

---

## Quick Start (Docker) — recommended

### 1. Get an API key

Go to your Jarvis web UI → **Settings → API Keys** → create a key.

### 2. Clone & configure

```bash
git clone https://github.com/Orange-Health/jarvis-mcp.git
cd jarvis-mcp
cp .env.example .env
```

Edit `.env`:

```env
JARVIS_API_KEY=sk-jarvis-xxxxxxxxxxxxx
JARVIS_URL=https://jarvis-api.orangehealth.dev
PORT=3100
```

### 3. Run

```bash
docker compose up -d
```

That's it. The MCP server is now running at `http://localhost:3100`.

### 4. Add to Cursor

Create or edit `.cursor/mcp.json` in your project (or `~/.cursor/mcp.json` for global):

```json
{
  "mcpServers": {
    "jarvis": {
      "url": "http://localhost:3100/sse"
    }
  }
}
```

### 5. Use it

In Cursor, just say:

> "use jarvis — how does authentication work in the cds repo?"

---

## Alternative: npx (no Docker)

If you prefer running directly on your machine:

```json
{
  "mcpServers": {
    "jarvis": {
      "command": "npx",
      "args": ["-y", "@orangehealth/jarvis-mcp"],
      "env": {
        "JARVIS_API_KEY": "sk-jarvis-...",
        "JARVIS_URL": "https://jarvis-api.orangehealth.dev",
        "JARVIS_WORKSPACE": "${workspaceFolder}"
      }
    }
  }
}
```

Or install globally:

```bash
npm install -g @orangehealth/jarvis-mcp
```

Then use `"command": "jarvis-mcp"` instead of npx.

---

## Tools

| Tool | Description |
|------|-------------|
| `jarvis_ask` | Full RAG query — retrieval + LLM answer about the codebase |
| `jarvis_search` | Retrieval only — fast, cheap code search without LLM |
| `jarvis_list_repos` | List all indexed repositories |
| `jarvis_invalidate` | Notify that files changed (clears cached context) |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JARVIS_API_KEY` | Yes | — | API key from Jarvis web UI |
| `JARVIS_URL` | No | `http://localhost:8001` | Jarvis backend URL |
| `PORT` | No | `3100` | SSE server port (Docker mode) |
| `JARVIS_WORKSPACE` | No | `cwd()` | Workspace root for file watcher (stdio mode only) |

## Architecture

```
Cursor ──(MCP over SSE)──► jarvis-mcp container ──(HTTP)──► Jarvis backend
                           localhost:3100                    jarvis-api.orangehealth.dev
```

- **Docker mode** — runs an HTTP server with SSE transport. Cursor connects via `"url"`.
- **stdio mode** — `npx` / global install. Cursor connects via `"command"`. Includes a local file watcher for cache invalidation.

Both modes use a local disk cache (1-hour TTL) to avoid repeated calls.

## Development

```bash
git clone https://github.com/Orange-Health/jarvis-mcp.git
cd jarvis-mcp
npm install
npm run build
npm start          # stdio mode
npm run start:sse  # SSE server mode
```

## License

MIT
