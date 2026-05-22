#!/usr/bin/env node

/**
 * Stdio entry point — used by `npx jarvis-mcp` or global install.
 * Cursor connects via: "command": "jarvis-mcp"
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { JarvisClient } from "./client.js";
import { Cache } from "./cache.js";
import { createMcpServer } from "./server.js";
import { detectWorkspace } from "./workspace.js";
import { startWatcher, stopWatcher } from "./watcher.js";

const JARVIS_API_KEY = process.env.JARVIS_API_KEY ?? "";
const JARVIS_URL = process.env.JARVIS_URL ?? "http://localhost:8001";
const JARVIS_WORKSPACE = process.env.JARVIS_WORKSPACE ?? process.cwd();

if (!JARVIS_API_KEY) {
  console.error(
    "JARVIS_API_KEY is not set. Generate one at your Jarvis web UI → Settings → API Keys."
  );
  process.exit(1);
}

const client = new JarvisClient(JARVIS_URL, JARVIS_API_KEY);
const cache = new Cache();
const workspace = JARVIS_WORKSPACE ? detectWorkspace(JARVIS_WORKSPACE) : null;
const server = createMcpServer({ client, cache, workspace });

async function main() {
  if (JARVIS_WORKSPACE) startWatcher(JARVIS_WORKSPACE, cache);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  stopWatcher();
  process.exit(1);
});

process.on("SIGINT", () => {
  stopWatcher();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopWatcher();
  process.exit(0);
});
