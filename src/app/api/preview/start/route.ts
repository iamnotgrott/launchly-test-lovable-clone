import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import http from "http";
import crypto from "crypto";
import { ensureDependenciesInstalled, ensureStarterProject } from "@/lib/projects/starter";

const PREVIEW_DIR = path.join(process.env.HOME || "/tmp", ".ai-app-builder", "previews");

function previewId(projectPath: string): string {
  return crypto.createHash("md5").update(projectPath).digest("hex").slice(0, 12);
}

function pidFile(id: string): string {
  return path.join(PREVIEW_DIR, `${id}.pid`);
}

function portFile(id: string): string {
  return path.join(PREVIEW_DIR, `${id}.port`);
}

function waitForServer(port: number, timeoutMs = 15000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        res.resume();
        res.on("end", () => resolve(true));
      });
      req.on("error", () => {
        if (Date.now() - startTime > timeoutMs) {
          resolve(false);
        } else {
          setTimeout(check, 500);
        }
      });
      req.setTimeout(2000, () => {
        req.destroy();
        if (Date.now() - startTime > timeoutMs) {
          resolve(false);
        } else {
          setTimeout(check, 500);
        }
      });
    };
    check();
  });
}

async function killExisting(id: string): Promise<void> {
  const pf = pidFile(id);
  const pid = await fs.readFile(pf, "utf-8").catch(() => null);
  if (pid) {
    try { process.kill(Number(pid)); } catch {}
    await fs.unlink(pf).catch(() => {});
    await fs.unlink(portFile(id)).catch(() => {});
  }
}

export async function POST(request: NextRequest) {
  try {
    const { projectPath } = await request.json();
    if (!projectPath) {
      return NextResponse.json({ error: "Project path is required" }, { status: 400 });
    }

    const id = previewId(projectPath);
    await fs.mkdir(PREVIEW_DIR, { recursive: true });
    const scaffold = await ensureStarterProject(projectPath);
    const install = await ensureDependenciesInstalled(projectPath);

    if (!install.success) {
      return NextResponse.json({
        error: `Dependencies failed to install. ${install.error || install.output.slice(-500)}`,
        setup: { scaffolded: scaffold.scaffolded, installed: false, installRan: install.installed },
      });
    }

    if (install.installed) {
      await killExisting(id);
    }

    const existingPort = await fs.readFile(portFile(id), "utf-8").catch(() => null);
    const existingPid = await fs.readFile(pidFile(id), "utf-8").catch(() => null);
    if (existingPort && existingPid) {
      try {
        process.kill(Number(existingPid), 0);
        return NextResponse.json({ port: Number(existingPort), pid: Number(existingPid) });
      } catch {
        await killExisting(id);
      }
    }

    const port = 5173 + Math.floor(Math.random() * 1000);

    const devProcess = spawn("npx", ["vite", "--port", String(port), "--host", "127.0.0.1"], {
      cwd: projectPath,
      env: { ...process.env, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });

    let output = "";
    devProcess.stdout?.on("data", (data: Buffer) => {
      output += data.toString();
    });
    devProcess.stderr?.on("data", (data: Buffer) => {
      output += data.toString();
    });

    devProcess.unref();

    await fs.writeFile(portFile(id), String(port));
    await fs.writeFile(pidFile(id), String(devProcess.pid));

    const isReady = await waitForServer(port, 15000);

    if (!isReady) {
      devProcess.kill();
      await fs.unlink(portFile(id)).catch(() => {});
      await fs.unlink(pidFile(id)).catch(() => {});
      return NextResponse.json({
        error: `Dev server failed to start within 15s. Output: ${output.slice(-500)}`,
      });
    }

    return NextResponse.json({
      port,
      pid: devProcess.pid,
      setup: { scaffolded: scaffold.scaffolded, installed: true, installRan: install.installed },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start preview" },
      { status: 500 }
    );
  }
}
