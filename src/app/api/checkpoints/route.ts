import { NextRequest, NextResponse } from "next/server";
import simpleGit from "simple-git";
import path from "path";
import fs from "fs/promises";

const CHECKPOINTS_DIR = path.join(process.env.HOME || "/tmp", ".ai-app-builder", "checkpoints");

async function ensureGitRepo(workspacePath: string) {
  const git = simpleGit(workspacePath);
  const isRepo = await git.checkIsRepo().catch(() => false);
  if (!isRepo) {
    await git.init();
    await git.addConfig("user.name", "Forge AI");
    await git.addConfig("user.email", "forge@local");
    await git.add(".");
    await git.commit("Initial commit", { "--allow-empty": null });
  }
  return git;
}

function checkpointRef(threadId: string, turnCount: number): string {
  return `refs/forge/checkpoints/${threadId}/turn/${turnCount}`;
}

export async function POST(request: NextRequest) {
  try {
    const { action, workspacePath, threadId, turnCount, targetTurnCount } = await request.json();

    if (!workspacePath) {
      return NextResponse.json({ error: "workspacePath is required" }, { status: 400 });
    }

    const git = await ensureGitRepo(workspacePath);

    switch (action) {
      case "capture": {
        const ref = checkpointRef(threadId || "default", turnCount || 0);
        await git.add(".");
        const result = await git.raw("commit-tree", "HEAD^{tree}", "-m", `Checkpoint: turn ${turnCount || 0}`);
        const commitHash = result.trim();
        await git.raw("update-ref", ref, commitHash);
        return NextResponse.json({ ref, commitHash });
      }

      case "diff": {
        const fromRef = checkpointRef(threadId || "default", 0);
        const toRef = checkpointRef(threadId || "default", turnCount || 0);
        const fromExists = await git.raw("rev-parse", "--verify", fromRef).catch(() => null);
        const toExists = await git.raw("rev-parse", "--verify", toRef).catch(() => null);

        if (!fromExists || !toExists) {
          return NextResponse.json({ diff: "", files: [] });
        }

        const diff = await git.diff([fromRef, toRef]);
        const files = parseDiffFiles(diff);
        return NextResponse.json({ diff, files });
      }

      case "list": {
        const prefix = `refs/forge/checkpoints/${threadId || "default"}/turn/`;
        const refs = await git.raw("for-each-ref", "--format=%(refname)", prefix);
        const checkpoints = refs
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((ref) => {
            const match = ref.match(/turn\/(\d+)$/);
            return { ref, turnCount: match ? parseInt(match[1]) : 0 };
          })
          .sort((a, b) => a.turnCount - b.turnCount);
        return NextResponse.json({ checkpoints });
      }

      case "revert": {
        const targetRef = checkpointRef(threadId || "default", targetTurnCount || 0);
        const exists = await git.raw("rev-parse", "--verify", targetRef).catch(() => null);
        if (!exists) {
          return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 });
        }
        const commitHash = exists.trim();
        await git.raw("restore", "--source", commitHash, "--worktree", "--staged", "--", ".");
        await git.raw("clean", "-fd", "--", ".");
        return NextResponse.json({ success: true, revertedTo: targetTurnCount });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkpoint operation failed" },
      { status: 500 }
    );
  }
}

function parseDiffFiles(diff: string): Array<{ path: string; additions: number; deletions: number; status: string }> {
  const files: Array<{ path: string; additions: number; deletions: number; status: string }> = [];
  const lines = diff.split("\n");
  let currentFile = "";
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      if (currentFile) {
        files.push({ path: currentFile, additions, deletions, status: "modified" });
      }
      const match = line.match(/b\/(.+)$/);
      currentFile = match ? match[1] : "";
      additions = 0;
      deletions = 0;
    } else if (line.startsWith("new file")) {
      files.push({ path: currentFile, additions: 0, deletions: 0, status: "added" });
    } else if (line.startsWith("deleted file")) {
      files.push({ path: currentFile, additions: 0, deletions: 0, status: "deleted" });
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      additions++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      deletions++;
    }
  }

  if (currentFile) {
    const existing = files.find((f) => f.path === currentFile);
    if (existing) {
      existing.additions = additions;
      existing.deletions = deletions;
    } else {
      files.push({ path: currentFile, additions, deletions, status: "modified" });
    }
  }

  return files;
}
