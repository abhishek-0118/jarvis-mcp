/**
 * File-system watcher using chokidar.
 * On add/change/unlink events, invalidates cache entries whose
 * files_referenced overlap with the changed relative path.
 */

import * as path from "node:path";
import type { FSWatcher } from "chokidar";
import type { Cache } from "./cache.js";

let watcher: FSWatcher | null = null;

export function startWatcher(workspacePath: string, cache: Cache): void {
  if (!workspacePath) return;

  import("chokidar").then(({ watch }) => {
    watcher = watch(workspacePath, {
      ignored: [
        /(^|[/\\])\./,
        "**/node_modules/**",
        "**/__pycache__/**",
        "**/dist/**",
        "**/build/**",
        "**/.git/**",
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    });

    const handle = (absPath: string) => {
      const rel = path.relative(workspacePath, absPath).replace(/\\/g, "/");
      cache.invalidateByPaths([rel]);
    };

    watcher.on("add", handle);
    watcher.on("change", handle);
    watcher.on("unlink", handle);

    watcher.on("error", (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[jarvis-mcp] watcher error:", msg);
    });
  });
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}
