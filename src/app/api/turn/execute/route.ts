import { NextRequest, NextResponse } from "next/server";
import { sendChatCompletion, streamChatCompletion, ChatMessage, selectModelForTask } from "@/lib/openrouter";
import { parseFileBlocks, generateDiff } from "@/lib/filesystem/diff";
import { validatePath } from "@/lib/filesystem/validator";
import { buildPlanningPrompt } from "@/prompts/planning";
import { buildCodeEditPrompt } from "@/prompts/code-edit";
import { buildErrorRepairPrompt } from "@/prompts/error-repair";
import { SYSTEM_PROMPT } from "@/prompts/system";
import { ensureDependenciesInstalled, ensureStarterProject } from "@/lib/projects/starter";
import fs from "fs/promises";
import path from "path";
import simpleGit from "simple-git";
import { spawn } from "child_process";

const MAX_REPAIR_RETRIES = 3;
const IGNORED_DIRS = [".git", "node_modules", ".next", ".turbo", "dist", "build", "out", ".cache"];

async function listFiles(dirPath: string, relativePath = ""): Promise<Array<{ path: string; name: string; isDirectory: boolean; children?: any[] }>> {
  const entries: Array<{ path: string; name: string; isDirectory: boolean; children?: any[] }> = [];
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory() && IGNORED_DIRS.includes(item.name)) continue;
      const childPath = path.join(dirPath, item.name);
      const childRelative = relativePath ? path.join(relativePath, item.name) : item.name;
      if (item.isDirectory()) {
        const children = await listFiles(childPath, childRelative);
        entries.push({ path: childRelative, name: item.name, isDirectory: true, children });
      } else {
        entries.push({ path: childRelative, name: item.name, isDirectory: false });
      }
    }
  } catch {}
  return entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

async function readAllFiles(basePath: string): Promise<Array<{ path: string; content: string }>> {
  const entries = await listFiles(basePath);
  const files: Array<{ path: string; content: string }> = [];
  async function walk(items: typeof entries) {
    for (const entry of items) {
      if (entry.isDirectory && entry.children) {
        await walk(entry.children);
      } else if (!entry.isDirectory && entry.path.match(/\.(tsx?|jsx?|css|html|json|md|svg)$/i)) {
        try {
          const content = await fs.readFile(path.join(basePath, entry.path), "utf-8");
          files.push({ path: entry.path, content });
        } catch {}
      }
    }
  }
  await walk(entries);
  return files;
}

async function safeWriteFile(workspacePath: string, relativePath: string, content: string): Promise<void> {
  const validation = validatePath(relativePath);
  if (!validation.valid) throw new Error(validation.error);
  const fullPath = path.join(workspacePath, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf-8");
}

async function safeReadFile(workspacePath: string, relativePath: string): Promise<string> {
  const validation = validatePath(relativePath);
  if (!validation.valid) throw new Error(validation.error);
  return fs.readFile(path.join(workspacePath, relativePath), "utf-8");
}

async function fileExists(fullPath: string): Promise<boolean> {
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

async function safeDeleteFile(workspacePath: string, relativePath: string): Promise<void> {
  const validation = validatePath(relativePath);
  if (!validation.valid) throw new Error(validation.error);
  await fs.unlink(path.join(workspacePath, relativePath));
}

const encoder = new TextEncoder();

export async function POST(request: NextRequest) {
  const { workspacePath, userMessage, chatHistory } = await request.json();
  const apiKey = request.headers.get("x-openrouter-key") || undefined;

  if (!workspacePath || !userMessage) {
    return NextResponse.json({ error: "workspacePath and userMessage are required" }, { status: 400 });
  }

  if (!apiKey && !process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "No API key provided. Set one in Settings or add OPENROUTER_API_KEY to .env.local." },
      { status: 401 }
    );
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const writeSSE = async (data: Record<string, unknown>) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  (async () => {
    try {
      await writeSSE({ type: "setup_start" });
      const scaffold = await ensureStarterProject(workspacePath);
      const initialInstall = await ensureDependenciesInstalled(workspacePath);
      if (!initialInstall.success) {
        await writeSSE({
          type: "failed",
          errorMessage: `Dependencies failed to install. ${initialInstall.error || initialInstall.output.slice(-500)}`,
          filesChanged: scaffold.filesCreated.map((filePath) => ({
            path: filePath,
            action: "created",
            additions: 0,
            deletions: 0,
          })),
          model: "none",
          retryCount: 0,
        });
        return;
      }
      await writeSSE({
        type: "setup_complete",
        scaffolded: scaffold.scaffolded,
        dependenciesInstalled: initialInstall.installed,
      });

      const files = await readAllFiles(workspacePath);
      const filePaths = files.map((f) => f.path);

      await writeSSE({ type: "plan_start" });

      const planMessages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...chatHistory.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }) as ChatMessage),
        { role: "user", content: buildPlanningPrompt(userMessage, filePaths) },
      ];

      const planResponse = await sendChatCompletion(planMessages, { model: selectModelForTask("planning"), apiKey });
      await writeSSE({ type: "plan_complete", content: planResponse.content });

      await writeSSE({ type: "checkpoint_start" });
      const preCheckpoint = await captureCheckpoint(workspacePath, Date.now());
      if (preCheckpoint) {
        await writeSSE({ type: "checkpoint_complete", ref: preCheckpoint.ref });
      }

      await writeSSE({ type: "execute_start" });

      const editMessages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...chatHistory.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }) as ChatMessage),
        { role: "user", content: buildCodeEditPrompt(userMessage, files) },
      ];

      let fullContent = "";
      let modelUsed = "";
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;

      try {
        for await (const chunk of streamChatCompletion(editMessages, {
          model: selectModelForTask("code-generation"),
          apiKey,
          onHeartbeat: async () => {
            await writeSSE({ type: "heartbeat" });
          },
        })) {
          if (chunk.done) {
            if (chunk.usage) {
              totalPromptTokens += chunk.usage.prompt_tokens;
              totalCompletionTokens += chunk.usage.completion_tokens;
            }
            break;
          }
          fullContent += chunk.content;
          modelUsed = chunk.model;
          await writeSSE({ type: "stream", content: chunk.content });
        }
      } catch (streamError) {
        const streamErrorMsg = streamError instanceof Error ? streamError.message : "Streaming failed";
        console.error("[Turn Execute] Stream error:", streamErrorMsg);
        await writeSSE({ type: "stream_error", message: streamErrorMsg });

        try {
          const response = await sendChatCompletion(editMessages, { model: selectModelForTask("code-generation"), apiKey });
          fullContent = response.content;
          modelUsed = response.model;
          if (response.usage) {
            totalPromptTokens += response.usage.prompt_tokens;
            totalCompletionTokens += response.usage.completion_tokens;
          }
          await writeSSE({ type: "stream", content: fullContent });
        } catch (fallbackError) {
          const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : "Fallback also failed";
          console.error("[Turn Execute] Fallback error:", fallbackMsg);
          await writeSSE({
            type: "failed",
            errorMessage: `AI request failed: ${streamErrorMsg}. Fallback: ${fallbackMsg}`,
            filesChanged: [],
            model: modelUsed || "unknown",
            retryCount: 0,
          });
          return;
        }
      }

      if (!fullContent.trim()) {
        await writeSSE({
          type: "failed",
          errorMessage: "AI returned empty response. Please try again.",
          filesChanged: [],
          model: modelUsed,
          retryCount: 0,
        });
        return;
      }

      const applyResult = await applyFileBlocks(workspacePath, fullContent);

      if (!applyResult.success && applyResult.error) {
        await writeSSE({ type: "error", message: applyResult.error });
        const repairResult = await attemptRepair(workspacePath, applyResult.error, apiKey);
        if (repairResult.success) {
          await writeSSE({
            type: "complete",
            filesChanged: repairResult.filesChanged,
            model: modelUsed,
            retryCount: repairResult.retryCount,
            summary: `Changes applied (with ${repairResult.retryCount} repair${repairResult.retryCount > 1 ? "s" : ""}). ${applyResult.summary}`,
            tokenUsage: { prompt: totalPromptTokens, completion: totalCompletionTokens },
          });
        } else {
          await writeSSE({
            type: "failed",
            filesChanged: applyResult.filesChanged,
            model: modelUsed,
            retryCount: repairResult.retryCount,
            errorMessage: repairResult.error || applyResult.error,
            summary: applyResult.summary,
            tokenUsage: { prompt: totalPromptTokens, completion: totalCompletionTokens },
          });
        }
      } else {
        const installResult = await ensureDependenciesInstalled(workspacePath);
        if (!installResult.success) {
          await writeSSE({
            type: "failed",
            filesChanged: applyResult.filesChanged,
            model: modelUsed,
            retryCount: 0,
            errorMessage: `Dependencies failed to install: ${installResult.error || installResult.output.slice(-500)}`,
            summary: applyResult.summary,
            tokenUsage: { prompt: totalPromptTokens, completion: totalCompletionTokens },
          });
          return;
        }

        await writeSSE({ type: "build_start" });
        const buildResult = await runBuild(workspacePath);

        if (!buildResult.success) {
          await writeSSE({ type: "build_error", message: buildResult.error });
          const repairResult = await attemptRepair(workspacePath, buildResult.error, apiKey);
          if (repairResult.success) {
            const postCheckpoint = await captureCheckpoint(workspacePath, Date.now());
            await writeSSE({
              type: "complete",
              filesChanged: repairResult.filesChanged,
              model: modelUsed,
              retryCount: repairResult.retryCount,
              summary: `Changes applied and build fixed (${repairResult.retryCount} repair${repairResult.retryCount > 1 ? "s" : ""}). ${applyResult.summary}`,
              tokenUsage: { prompt: totalPromptTokens, completion: totalCompletionTokens },
              checkpointRef: postCheckpoint?.ref,
            });
          } else {
            await writeSSE({
              type: "failed",
              filesChanged: applyResult.filesChanged,
              model: modelUsed,
              retryCount: repairResult.retryCount,
              errorMessage: `Build failed: ${buildResult.error.slice(0, 500)}`,
              summary: applyResult.summary,
              tokenUsage: { prompt: totalPromptTokens, completion: totalCompletionTokens },
            });
          }
        } else {
          const postCheckpoint = await captureCheckpoint(workspacePath, Date.now());
          await writeSSE({
            type: "complete",
            filesChanged: applyResult.filesChanged,
            model: modelUsed,
            retryCount: 0,
            summary: applyResult.summary,
            tokenUsage: { prompt: totalPromptTokens, completion: totalCompletionTokens },
            checkpointRef: postCheckpoint?.ref,
          });
        }
      }
    } catch (error) {
      await writeSSE({ type: "failed", errorMessage: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      try {
        await writer.close();
      } catch {}
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function applyFileBlocks(workspacePath: string, content: string) {
  const blocks = parseFileBlocks(content);
  const filesChanged: Array<{ path: string; action: string; additions: number; deletions: number }> = [];
  const errors: string[] = [];

  if (blocks.length === 0) {
    return {
      success: false,
      filesChanged,
      summary: "0 created, 0 modified, 0 deleted",
      error: "No file changes were returned. The response must include at least one ```file: path``` block.",
    };
  }

  for (const block of blocks) {
    try {
      const validation = validatePath(block.path);
      if (!validation.valid) {
        errors.push(`Skipping ${block.path}: ${validation.error}`);
        continue;
      }

      const fullPath = path.join(workspacePath, block.path);

      if (block.action === "delete") {
        if (await fileExists(fullPath)) {
          await safeDeleteFile(workspacePath, block.path);
          filesChanged.push({ path: block.path, action: "deleted", additions: 0, deletions: 0 });
        }
      } else {
        if (!block.content || block.content.trim().length === 0) {
          errors.push(`Skipping ${block.path}: empty content`);
          continue;
        }
        const existed = await fileExists(fullPath);
        const oldContent = existed ? await safeReadFile(workspacePath, block.path) : "";
        await safeWriteFile(workspacePath, block.path, block.content);
        const diff = generateDiff(block.path, oldContent, block.content);
        filesChanged.push({
          path: block.path,
          action: existed ? "modified" : "created",
          additions: diff.additions,
          deletions: diff.deletions,
        });
      }
    } catch (error) {
      errors.push(`Failed to ${block.action === "delete" ? "delete" : "write"} ${block.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const summary = `${filesChanged.filter((f) => f.action === "created").length} created, ${filesChanged.filter((f) => f.action === "modified").length} modified, ${filesChanged.filter((f) => f.action === "deleted").length} deleted`;
  return { success: errors.length === 0, filesChanged, summary, error: errors.length > 0 ? errors.join("\n") : undefined };
}

async function attemptRepair(workspacePath: string, errorMessage: string, apiKey?: string) {
  let retryCount = 0;
  let lastError = errorMessage;

  while (retryCount < MAX_REPAIR_RETRIES) {
    retryCount++;
    const currentFiles = await readAllFiles(workspacePath);
    const repairMessages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildErrorRepairPrompt(lastError, currentFiles) },
    ];

    let repairContent = "";
    for await (const chunk of streamChatCompletion(repairMessages, { model: selectModelForTask("error-repair"), apiKey })) {
      if (chunk.done) break;
      repairContent += chunk.content;
    }

    const result = await applyFileBlocks(workspacePath, repairContent);
    if (result.success) {
      const installResult = await ensureDependenciesInstalled(workspacePath);
      if (!installResult.success) {
        lastError = `Dependencies failed to install: ${installResult.error || installResult.output.slice(-500)}`;
        continue;
      }

      const buildResult = await runBuild(workspacePath);
      if (!buildResult.success) {
        lastError = buildResult.error || buildResult.output || "Build failed after repair";
        continue;
      }

      return { success: true, filesChanged: result.filesChanged, retryCount };
    }
    lastError = result.error || "Unknown error during repair";
  }

  return { success: false, filesChanged: [], error: `Failed after ${MAX_REPAIR_RETRIES} repair attempts. Last error: ${lastError}`, retryCount };
}

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

async function captureCheckpoint(workspacePath: string, turnCount: number): Promise<{ ref: string; commitHash: string } | null> {
  try {
    const git = await ensureGitRepo(workspacePath);
    const ref = `refs/forge/checkpoints/default/turn/${turnCount}`;
    await git.add(".");
    const result = await git.raw("commit-tree", "HEAD^{tree}", "-m", `Checkpoint: turn ${turnCount}`);
    const commitHash = result.trim();
    await git.raw("update-ref", ref, commitHash);
    return { ref, commitHash };
  } catch {
    return null;
  }
}

async function detectBuildCommand(workspacePath: string): Promise<{ cmd: string; args: string[] }> {
  try {
    const pkgRaw = await fs.readFile(path.join(workspacePath, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw);
    if (pkg.scripts?.build) {
      return { cmd: "npm", args: ["run", "build"] };
    }
  } catch {}

  const hasViteConfig = await fileExists(path.join(workspacePath, "vite.config.ts"))
    || await fileExists(path.join(workspacePath, "vite.config.js"));
  if (hasViteConfig) {
    return { cmd: "npx", args: ["vite", "build"] };
  }

  return { cmd: "npx", args: ["tsc", "--noEmit"] };
}

async function runBuild(workspacePath: string): Promise<{ success: boolean; output: string; error: string }> {
  const { cmd, args } = await detectBuildCommand(workspacePath);

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn(cmd, args, { cwd: workspacePath, shell: true });

    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      resolve({ success: code === 0, output: stdout, error: stderr || stdout });
    });

    proc.on("error", (err) => {
      resolve({ success: false, output: stdout, error: err.message });
    });

    setTimeout(() => {
      proc.kill();
      resolve({ success: false, output: stdout, error: "Build timed out after 60s" });
    }, 60000);
  });
}
