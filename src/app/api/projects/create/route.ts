import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const PROJECTS_DIR = path.join(process.env.HOME || "/tmp", ".ai-app-builder", "projects");

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const id = crypto.randomUUID().slice(0, 8);
    const workspacePath = path.join(PROJECTS_DIR, id);
    await fs.mkdir(workspacePath, { recursive: true });

    const project = {
      id,
      name: name.trim(),
      workspacePath,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return NextResponse.json({ project, files: [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create project" },
      { status: 500 }
    );
  }
}
