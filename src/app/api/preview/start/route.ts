import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

const PORT_FILE = path.join(process.env.HOME || "/tmp", ".ai-app-builder", ".preview-port");

export async function POST(request: NextRequest) {
  try {
    const { projectPath } = await request.json();
    if (!projectPath) {
      return NextResponse.json({ error: "Project path is required" }, { status: 400 });
    }

    const port = 5173 + Math.floor(Math.random() * 1000);

    await fs.mkdir(path.dirname(PORT_FILE), { recursive: true });
    await fs.writeFile(PORT_FILE, String(port));

    const hasPackageJson = await fs
      .access(path.join(projectPath, "package.json"))
      .then(() => true)
      .catch(() => false);

    if (!hasPackageJson) {
      return NextResponse.json({ error: "No package.json found. Generate a project first." });
    }

    const devProcess = spawn("npx", ["vite", "--port", String(port), "--host", "127.0.0.1"], {
      cwd: projectPath,
      env: { ...process.env, PORT: String(port) },
      stdio: "ignore",
      detached: true,
    });

    devProcess.unref();

    return NextResponse.json({ port, pid: devProcess.pid });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start preview" },
      { status: 500 }
    );
  }
}
