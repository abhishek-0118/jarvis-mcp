
import * as fs from "node:fs";
import * as path from "node:path";

export interface WorkspaceInfo {
  repoName: string | null;
  dirName: string;
  gitRemote: string | null;
}

export function detectWorkspace(workspacePath: string): WorkspaceInfo {
  const dirName = path.basename(workspacePath);
  let repoName: string | null = null;
  let gitRemote: string | null = null;

  try {
    const gitConfigPath = path.join(workspacePath, ".git", "config");
    const config = fs.readFileSync(gitConfigPath, "utf-8");

    const remoteMatch = config.match(
      /\[remote\s+"origin"\]\s*\n\s*url\s*=\s*(.+)/
    );
    if (remoteMatch) {
      gitRemote = remoteMatch[1].trim();
      // Extract repo name: git@github.com:Org/repo-name.git → repo-name
      const nameMatch = gitRemote.match(/[/:]([^/]+?)(?:\.git)?$/);
      if (nameMatch) {
        repoName = nameMatch[1];
      }
    }
  } catch {
    // no .git/config — use dir name
  }

  return {
    repoName: repoName ?? dirName,
    dirName,
    gitRemote,
  };
}
