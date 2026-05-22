#!/usr/bin/env node

/**
 * HTTP + SSE entry point — used by Docker / remote deployment.
 * Cursor connects via: "url": "http://host:3100/sse"
 */

import * as http from "node:http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { JarvisClient } from "./client.js";
import { Cache } from "./cache.js";
import { createMcpServer } from "./server.js";

const JARVIS_API_KEY = process.env.JARVIS_API_KEY ?? "";
const JARVIS_URL = process.env.JARVIS_URL ?? "http://localhost:8001";
const PORT = parseInt(process.env.PORT ?? "3100", 10);

if (!JARVIS_API_KEY) {
  console.error(
    "JARVIS_API_KEY is not set. Generate one at your Jarvis web UI → Settings → API Keys."
  );
  process.exit(1);
}

const client = new JarvisClient(JARVIS_URL, JARVIS_API_KEY);
const cache = new Cache();

const sessions = new Map<string, SSEServerTransport>();

const httpServer = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/sse") {
    const transport = new SSEServerTransport("/message", res);
    sessions.set(transport.sessionId, transport);

    req.on("close", () => {
      sessions.delete(transport.sessionId);
    });

    const server = createMcpServer({ client, cache });
    await server.connect(transport);
    return;
  }

  if (req.method === "POST" && url.pathname === "/message") {
    const sessionId = url.searchParams.get("sessionId") ?? "";
    const transport = sessions.get(sessionId);

    if (!transport) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unknown or expired session" }));
      return;
    }

    await transport.handlePostMessage(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        sessions: sessions.size,
        uptime: process.uptime(),
      })
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`[jarvis-mcp] SSE server listening on http://0.0.0.0:${PORT}`);
  console.log(`[jarvis-mcp] Cursor config → "url": "http://localhost:${PORT}/sse"`);
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
