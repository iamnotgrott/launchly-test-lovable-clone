import { createPatch } from "diff";

export interface FileDiff {
  path: string;
  oldContent: string;
  newContent: string;
  unifiedDiff: string;
  additions: number;
  deletions: number;
}

export function generateDiff(path: string, oldContent: string, newContent: string): FileDiff {
  const unifiedDiff = createPatch(path, oldContent, newContent, "", "");
  const lines = unifiedDiff.split("\n");
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.startsWith("+") && !line.startsWith("+++")) additions++;
    if (line.startsWith("-") && !line.startsWith("---")) deletions++;
  }

  return { path, oldContent, newContent, unifiedDiff, additions, deletions };
}

export function parseFileBlocks(content: string): Array<{ action: "file" | "delete"; path: string; content: string }> {
  const blocks: Array<{ action: "file" | "delete"; path: string; content: string }> = [];
  const regex = /```(?:file|delete):\s*([^\n]+)\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const isDelete = match[0].startsWith("```delete:");
    blocks.push({
      action: isDelete ? "delete" : "file",
      path: match[1].trim(),
      content: isDelete ? "" : match[2].trim(),
    });
  }

  return blocks;
}

export function formatDiffSummary(changes: Array<{ path: string; action: string }>): string {
  if (changes.length === 0) return "No files changed.";

  const created = changes.filter((c) => c.action === "created");
  const modified = changes.filter((c) => c.action === "modified");
  const deleted = changes.filter((c) => c.action === "deleted");

  const parts: string[] = [];
  if (created.length > 0) parts.push(`${created.length} file${created.length > 1 ? "s" : ""} created`);
  if (modified.length > 0) parts.push(`${modified.length} file${modified.length > 1 ? "s" : ""} modified`);
  if (deleted.length > 0) parts.push(`${deleted.length} file${deleted.length > 1 ? "s" : ""} deleted`);

  return parts.join(", ");
}
