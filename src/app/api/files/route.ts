import { NextRequest, NextResponse } from "next/server";
import { listFiles, readFile, writeFile, deleteFile, fileExists, readAllFiles } from "@/lib/filesystem/manager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, path: filePath, content } = body;

    switch (action) {
      case "list": {
        const entries = await listFiles(filePath);
        return NextResponse.json({ entries });
      }
      case "read": {
        const content = await readFile(filePath);
        return NextResponse.json({ content });
      }
      case "write": {
        await writeFile(filePath, content || "");
        return NextResponse.json({ success: true });
      }
      case "delete": {
        await deleteFile(filePath);
        return NextResponse.json({ success: true });
      }
      case "exists": {
        const exists = await fileExists(filePath);
        return NextResponse.json({ exists });
      }
      case "readAll": {
        const files = await readAllFiles(filePath);
        return NextResponse.json({ files });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "File operation failed" },
      { status: 500 }
    );
  }
}
