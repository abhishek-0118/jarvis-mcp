import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";

const TTL_MS = 60 * 60 * 1000; // 1 hour
const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface CacheEntry {
  answer: string;
  files_referenced: string[];
}

interface StoredEntry {
  query: string;
  repo: string | null;
  answer: string;
  files_referenced: string[];
  ts: number; // unix ms
}

export class Cache {
  private dir: string;
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const username = os.userInfo().username || "default";
    this.dir = path.join(os.tmpdir(), "jarvis-mcp", username, "contexts");
    fs.mkdirSync(this.dir, { recursive: true });

    this.sweepTimer = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
  }

  private keyFor(query: string, repo?: string): string {
    const raw = `${query}|${repo ?? ""}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  private filePath(key: string): string {
    return path.join(this.dir, `${key}.json`);
  }

  get(query: string, repo?: string): CacheEntry | null {
    const fp = this.filePath(this.keyFor(query, repo));
    try {
      const data: StoredEntry = JSON.parse(fs.readFileSync(fp, "utf-8"));
      if (Date.now() - data.ts > TTL_MS) {
        fs.unlinkSync(fp);
        return null;
      }
      return { answer: data.answer, files_referenced: data.files_referenced };
    } catch {
      return null;
    }
  }

  set(query: string, repo: string | undefined, entry: CacheEntry): void {
    const key = this.keyFor(query, repo);
    const stored: StoredEntry = {
      query,
      repo: repo ?? null,
      answer: entry.answer,
      files_referenced: entry.files_referenced,
      ts: Date.now(),
    };
    fs.writeFileSync(this.filePath(key), JSON.stringify(stored), "utf-8");
  }


  invalidateByPaths(changedPaths: string[]): number {
    if (changedPaths.length === 0) return 0;
    const changedSet = new Set(changedPaths.map((p) => p.replace(/\\/g, "/")));
    let removed = 0;

    for (const file of this.listFiles()) {
      try {
        const data: StoredEntry = JSON.parse(
          fs.readFileSync(path.join(this.dir, file), "utf-8")
        );
        const overlap = (data.files_referenced ?? []).some((fp) =>
          changedSet.has(fp.replace(/\\/g, "/"))
        );
        if (overlap) {
          fs.unlinkSync(path.join(this.dir, file));
          removed++;
        }
      } catch {
        try {
          fs.unlinkSync(path.join(this.dir, file));
        } catch {}
      }
    }
    return removed;
  }

  sweep(): void {
    const now = Date.now();
    for (const file of this.listFiles()) {
      const fp = path.join(this.dir, file);
      try {
        const data: StoredEntry = JSON.parse(fs.readFileSync(fp, "utf-8"));
        if (now - data.ts > TTL_MS) {
          fs.unlinkSync(fp);
        }
      } catch {
        try {
          fs.unlinkSync(fp);
        } catch {}
      }
    }
  }

  stop(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }

  private listFiles(): string[] {
    try {
      return fs.readdirSync(this.dir).filter((f) => f.endsWith(".json"));
    } catch {
      return [];
    }
  }
}
