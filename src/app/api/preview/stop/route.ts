import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const PORT_FILE = path.join(process.env.HOME || "/tmp", ".ai-app-builder", ".preview-port");

export async function POST() {
  try {
    const port = await fs.readFile(PORT_FILE, "utf-8").catch(() => null);
    if (port) {
      try {
        process.kill(-Number(port));
      } catch {}
      await fs.unlink(PORT_FILE).catch(() => {});
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to stop preview" },
      { status: 500 }
    );
  }
}
