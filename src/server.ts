/**
 * Shared MCP server factory — registers all Jarvis tools and resources.
 * Both stdio (index.ts) and SSE (sse-server.ts) entry points use this.
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { JarvisClient } from "./client.js";
import { Cache } from "./cache.js";
import type { WorkspaceInfo } from "./workspace.js";

const PKG_VERSION = "0.1.0";

interface ServerOptions {
  client: JarvisClient;
  cache: Cache;
  workspace?: WorkspaceInfo | null;
}

export function createMcpServer({ client, cache, workspace }: ServerOptions): McpServer {
  const server = new McpServer({
    name: "jarvis",
    version: PKG_VERSION,
  });

  const currentRepo = workspace?.repoName ?? undefined;

  // ── Tools ──

  server.tool(
    "jarvis_ask",
    `Ask Jarvis a question about the codebase. ONLY use this tool when the user explicitly says "use jarvis" in their message.${
      currentRepo
        ? ` The user is currently working in the "${currentRepo}" repository.`
        : ""
    }`,
    {
      query: z.string().describe("The question to ask about the codebase"),
      repo: z
        .string()
        .optional()
        .describe(
          `Repository name to search.${
            currentRepo
              ? ` Defaults to "${currentRepo}" (current workspace). Pass a different name to search another repo, or omit to search all.`
              : " Omit to search all indexed repos."
          }`
        ),
    },
    async ({ query, repo }) => {
      const effectiveRepo = repo ?? currentRepo;
      const cached = cache.get(query, effectiveRepo);
      if (cached) {
        return {
          content: [{ type: "text" as const, text: cached.answer }],
        };
      }

      const result = await client.ask(query, effectiveRepo);
      cache.set(query, effectiveRepo, {
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
    `Search the Jarvis code index for relevant code snippets. ONLY use this tool when the user explicitly says "use jarvis" in their message.${
      currentRepo
        ? ` The user is currently in the "${currentRepo}" repository.`
        : ""
    }`,
    {
      query: z.string().describe("The search query"),
      repo: z
        .string()
        .optional()
        .describe(
          `Repository name to search.${
            currentRepo
              ? ` Defaults to "${currentRepo}" (current workspace).`
              : " Omit to search all indexed repos."
          }`
        ),
    },
    async ({ query, repo }) => {
      const effectiveRepo = repo ?? currentRepo;
      const result = await client.search(query, effectiveRepo);
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
    "List all repositories indexed by Jarvis. ONLY use when the user explicitly says 'use jarvis'.",
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
    "Notify Jarvis that files were modified, created, or deleted — clears cached context for those paths.",
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

  // ── Resources ──

  server.resource(
    "workspace-info",
    "jarvis://workspace",
    {
      description:
        "Current workspace context — repository name, git remote, and available Jarvis capabilities.",
    },
    async () => {
      const info = [
        `Current workspace: ${workspace?.dirName ?? "unknown"}`,
        `Detected repo: ${currentRepo ?? "none"}`,
        `Git remote: ${workspace?.gitRemote ?? "none"}`,
        "",
        "Jarvis tools available: jarvis_ask (RAG Q&A), jarvis_search (code search), jarvis_list_repos, jarvis_invalidate",
      ].join("\n");

      return {
        contents: [
          {
            uri: "jarvis://workspace",
            mimeType: "text/plain",
            text: info,
          },
        ],
      };
    }
  );

  return server;
}
