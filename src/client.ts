import type { WorkspaceMetadata } from "./server.js";

export class JarvisClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  private async post<T = any>(
    path: string,
    body: Record<string, any>
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Jarvis API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  private async get<T = any>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Jarvis API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  async ask(
    query: string,
    repo?: string,
    depth: string = "moderate",
    metadata?: WorkspaceMetadata | null,
  ): Promise<{
    answer: string;
    sources: any[];
    summary: any;
    files_referenced: string[];
  }> {
    return this.post("/mcp/ask", {
      query,
      repo: repo ?? null,
      depth,
      metadata: metadata ?? null,
    });
  }

  async search(
    query: string,
    repo?: string,
    depth: string = "moderate",
    metadata?: WorkspaceMetadata | null,
  ): Promise<{
    context: string;
    sources: any[];
    summary: any;
    files_referenced: string[];
  }> {
    return this.post("/mcp/search", {
      query,
      repo: repo ?? null,
      depth,
      metadata: metadata ?? null,
    });
  }

  async repos(): Promise<{
    repositories: any[];
    total_count: number;
  }> {
    return this.get("/mcp/repos");
  }

  async invalidate(filePaths: string[]): Promise<void> {
    await this.post("/mcp/context/invalidate", { file_paths: filePaths });
  }
}
