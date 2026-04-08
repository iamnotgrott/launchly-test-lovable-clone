import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const PREVIEW_DIR = path.join(process.env.HOME || "/tmp", ".ai-app-builder", "previews");

function previewId(projectPath: string): string {
  return crypto.createHash("md5").update(projectPath).digest("hex").slice(0, 12);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const projectPath = body.projectPath;

    if (projectPath) {
      const id = previewId(projectPath);
      const pf = path.join(PREVIEW_DIR, `${id}.pid`);
      const pid = await fs.readFile(pf, "utf-8").catch(() => null);
      if (pid) {
        try { process.kill(Number(pid)); } catch {}
        await fs.unlink(pf).catch(() => {});
        await fs.unlink(path.join(PREVIEW_DIR, `${id}.port`)).catch(() => {});
      }
      return NextResponse.json({ success: true });
    }

    const files = await fs.readdir(PREVIEW_DIR).catch(() => []);
    for (const file of files) {
      if (file.endsWith(".pid")) {
        const pid = await fs.readFile(path.join(PREVIEW_DIR, file), "utf-8").catch(() => null);
        if (pid) {
          try { process.kill(Number(pid)); } catch {}
        }
        await fs.unlink(path.join(PREVIEW_DIR, file)).catch(() => {});
        const portF = file.replace(".pid", ".port");
        await fs.unlink(path.join(PREVIEW_DIR, portF)).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to stop preview" },
      { status: 500 }
    );
  }
}
