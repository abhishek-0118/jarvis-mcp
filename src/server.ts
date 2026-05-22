/**
 * Shared MCP server factory — registers all Jarvis tools.
 * Both stdio (index.ts) and SSE (sse-server.ts) entry points use this.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { JarvisClient } from "./client.js";
import { Cache } from "./cache.js";

const PKG_VERSION = "0.1.0";

export function createMcpServer(client: JarvisClient, cache: Cache): McpServer {
  const server = new McpServer({
    name: "jarvis",
    version: PKG_VERSION,
  });

  server.tool(
    "jarvis_ask",
    "Ask Jarvis a question about the codebase. Use when the user says 'use jarvis' or asks about repository context, architecture, or implementation details.",
    {
      query: z.string().describe("The question to ask about the codebase"),
      repo: z
        .string()
        .optional()
        .describe("Specific repository name to search (omit to search all)"),
    },
    async ({ query, repo }) => {
      const cached = cache.get(query, repo);
      if (cached) {
        return {
          content: [{ type: "text" as const, text: cached.answer }],
        };
      }

      const result = await client.ask(query, repo);
      cache.set(query, repo, {
        answer: result.answer,
        files_referenced: result.files_referenced ?? [],
      });

      return {
        content: [{ type: "text" as const, text: result.answer }],
      };
    }
  );

  server.tool(
    "jarvis_search",
    "Search the Jarvis code index without an LLM call — fast, cheap retrieval of relevant code snippets and file context.",
    {
      query: z.string().describe("The search query"),
      repo: z
        .string()
        .optional()
        .describe("Specific repository name to search (omit to search all)"),
    },
    async ({ query, repo }) => {
      const result = await client.search(query, repo);
      const summary = [
        `Found ${result.sources?.length ?? 0} sources across ${
          result.summary?.repositories?.length ?? 0
        } repos.`,
        "",
        result.context ?? "",
      ].join("\n");

      return {
        content: [{ type: "text" as const, text: summary }],
      };
    }
  );

  server.tool(
    "jarvis_list_repos",
    "List all repositories indexed by Jarvis.",
    {},
    async () => {
      const result = await client.repos();
      const text = result.repositories
        .map(
          (r: any) =>
            `- ${r.name} (${r.type}${r.branch ? `, branch: ${r.branch}` : ""})`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: text || "No repositories indexed.",
          },
        ],
      };
    }
  );

  server.tool(
    "jarvis_invalidate",
    "Notify Jarvis that files were modified, created, or deleted — clears cached context for those paths. Call after editing files outside the watched workspace.",
    {
      file_paths: z
        .array(z.string())
        .describe("List of relative file paths that changed"),
    },
    async ({ file_paths }) => {
      cache.invalidateByPaths(file_paths);
      await client.invalidate(file_paths);
      return {
        content: [
          {
            type: "text" as const,
            text: `Invalidated context for ${file_paths.length} file(s).`,
          },
        ],
      };
    }
  );

  return server;
}
