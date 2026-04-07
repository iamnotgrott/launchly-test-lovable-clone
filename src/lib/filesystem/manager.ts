import fs from "fs/promises";
import path from "path";
import { validatePath } from "./validator";
import { FileEntry } from "@/types";

const IGNORED_DIRS = [".git", "node_modules", ".next", ".turbo", "dist", "build", "out", ".cache", ".npm-cache"];

export async function listFiles(dirPath: string, relativePath = ""): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];

  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      if (item.isDirectory() && IGNORED_DIRS.includes(item.name)) continue;

      const childPath = path.join(dirPath, item.name);
      const childRelative = relativePath ? path.join(relativePath, item.name) : item.name;

      if (item.isDirectory()) {
        const children = await listFiles(childPath, childRelative);
        entries.push({
          path: childRelative,
          name: item.name,
          isDirectory: true,
          children,
        });
      } else {
        entries.push({
          path: childRelative,
          name: item.name,
          isDirectory: false,
        });
      }
    }
  } catch {
    // directory doesn't exist or permission denied
  }

  return entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function readFile(filePath: string): Promise<string> {
  const validation = validatePath(filePath);
  if (!validation.valid) throw new Error(validation.error);
  return fs.readFile(filePath, "utf-8");
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  const validation = validatePath(filePath);
  if (!validation.valid) throw new Error(validation.error);

  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
}

export async function deleteFile(filePath: string): Promise<void> {
  const validation = validatePath(filePath);
  if (!validation.valid) throw new Error(validation.error);
  await fs.unlink(filePath);
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readAllFiles(basePath: string): Promise<Array<{ path: string; content: string }>> {
  const entries = await listFiles(basePath);
  const files: Array<{ path: string; content: string }> = [];

  async function walk(entries: FileEntry[]) {
    for (const entry of entries) {
      if (entry.isDirectory && entry.children) {
        await walk(entry.children);
      } else if (!entry.isDirectory && entry.path.match(/\.(tsx?|jsx?|css|html|json|md|svg)$/i)) {
        try {
          const content = await fs.readFile(path.join(basePath, entry.path), "utf-8");
          files.push({ path: entry.path, content });
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  await walk(entries);
  return files;
}
