import path from "path";

const DANGEROUS_PATTERNS = [
  "../", "..\\",
  "~/",
  "/etc/", "/usr/", "/root/", "/var/",
  "/proc/", "/sys/", "/dev/",
  "node_modules/",
  ".git/",
];

const BLOCKED_EXTENSIONS = [
  ".env", ".pem", ".key", ".p12", ".pfx",
];

export function validatePath(relativePath: string): { valid: boolean; error?: string } {
  if (!relativePath || relativePath.trim().length === 0) {
    return { valid: false, error: "Path cannot be empty" };
  }

  const normalized = relativePath
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  if (!normalized) {
    return { valid: false, error: "Path cannot be empty" };
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (normalized.includes(pattern) || relativePath.includes(pattern)) {
      return { valid: false, error: `Path contains potentially dangerous pattern: ${pattern}` };
    }
  }

  if (/^[a-zA-Z]:\\/.test(relativePath)) {
    return { valid: false, error: "Path must be relative" };
  }

  if (relativePath.startsWith("/")) {
    return { valid: false, error: "Path must be relative, not absolute" };
  }

  const ext = path.extname(normalized).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File extension ${ext} is not allowed` };
  }

  return { valid: true };
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function isWithinWorkspace(filePath: string, workspacePath: string): boolean {
  const resolved = path.resolve(workspacePath, filePath);
  return resolved.startsWith(path.resolve(workspacePath));
}
