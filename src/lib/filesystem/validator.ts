const DANGEROUS_PATTERNS = ["../", "..\\", "~/", "/etc/", "/usr/", "/root/", "/var/"];

export function validatePath(relativePath: string): { valid: boolean; error?: string } {
  if (!relativePath || relativePath.trim().length === 0) {
    return { valid: false, error: "Path cannot be empty" };
  }

  const normalized = relativePath.replace(/\\/g, "/").replace(/\/+/g, "/");

  for (const pattern of DANGEROUS_PATTERNS) {
    if (normalized.includes(pattern)) {
      return { valid: false, error: `Path contains potentially dangerous pattern: ${pattern}` };
    }
  }

  if (normalized.startsWith("/") || /^[a-zA-Z]:\\/.test(relativePath)) {
    return { valid: false, error: "Path must be relative" };
  }

  return { valid: true };
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
