import crypto from "crypto";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

const PACKAGE_HASH_FILE = path.join("node_modules", ".forge-package-json.hash");

const STARTER_FILES: Record<string, string> = {
  "package.json": `${JSON.stringify(
    {
      name: "forge-app",
      private: true,
      version: "0.1.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview",
      },
      dependencies: {
        "@vitejs/plugin-react": "^5.0.0",
        vite: "^7.0.0",
        typescript: "^5.0.0",
        react: "^19.2.0",
        "react-dom": "^19.2.0",
      },
      devDependencies: {},
    },
    null,
    2
  )}\n`,
  "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Forge App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
  "vite.config.ts": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`,
  "tsconfig.json": `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["DOM", "DOM.Iterable", "ES2020"],
        allowJs: false,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        module: "ESNext",
        moduleResolution: "Node",
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
      },
      include: ["src"],
    },
    null,
    2
  )}\n`,
  "src/main.tsx": `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
  "src/App.tsx": `export default function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Forge starter</p>
        <h1>Describe the app you want to build.</h1>
        <p className="lede">
          This project is ready for AI edits and live preview. Start with a prompt like
          "make a counter app with a big button".
        </p>
        <button type="button" onClick={() => alert("Ready to build")}>
          Try the starter
        </button>
      </section>
    </main>
  );
}
`,
  "src/App.css": `:root {
  color: #1c1c1c;
  background: #f7f7f4;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.5;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

button {
  border: 0;
  border-radius: 8px;
  background: #155f53;
  color: white;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: 0.9rem 1.2rem;
}

button:hover {
  background: #0f4d43;
}

.app-shell {
  align-items: center;
  display: flex;
  min-height: 100vh;
  padding: 2rem;
}

.hero {
  max-width: 720px;
}

.eyebrow {
  color: #155f53;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0;
  margin: 0 0 0.75rem;
  text-transform: uppercase;
}

h1 {
  font-size: clamp(2.4rem, 8vw, 5.8rem);
  line-height: 0.95;
  margin: 0;
  max-width: 10ch;
}

.lede {
  color: #454545;
  font-size: 1.1rem;
  margin: 1.5rem 0 2rem;
  max-width: 58ch;
}
`,
};

export interface StarterProjectResult {
  scaffolded: boolean;
  filesCreated: string[];
}

export interface DependencyInstallResult {
  installed: boolean;
  success: boolean;
  output: string;
  error?: string;
}

interface DependencyInstallOptions {
  install?: () => Promise<{ success: boolean; output: string; error?: string }>;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readPackageHash(workspacePath: string): Promise<string | null> {
  return fs.readFile(path.join(workspacePath, PACKAGE_HASH_FILE), "utf-8").catch(() => null);
}

async function writePackageHash(workspacePath: string): Promise<void> {
  const hashPath = path.join(workspacePath, PACKAGE_HASH_FILE);
  await fs.mkdir(path.dirname(hashPath), { recursive: true });
  await fs.writeFile(hashPath, await packageJsonHash(workspacePath), "utf-8");
}

export async function packageJsonHash(workspacePath: string): Promise<string> {
  const packageJson = await fs.readFile(path.join(workspacePath, "package.json"), "utf-8");
  return crypto.createHash("sha256").update(packageJson).digest("hex");
}

export async function ensureStarterProject(workspacePath: string): Promise<StarterProjectResult> {
  await fs.mkdir(workspacePath, { recursive: true });

  const filesCreated: string[] = [];
  for (const [relativePath, content] of Object.entries(STARTER_FILES)) {
    const fullPath = path.join(workspacePath, relativePath);
    if (await pathExists(fullPath)) continue;

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");
    filesCreated.push(relativePath);
  }

  return {
    scaffolded: filesCreated.length > 0,
    filesCreated,
  };
}

export async function needsDependencyInstall(workspacePath: string): Promise<boolean> {
  const packagePath = path.join(workspacePath, "package.json");
  if (!(await pathExists(packagePath))) return false;
  if (!(await pathExists(path.join(workspacePath, "node_modules")))) return true;

  const previousHash = await readPackageHash(workspacePath);
  if (!previousHash) return true;

  return previousHash.trim() !== (await packageJsonHash(workspacePath));
}

export async function ensureDependenciesInstalled(
  workspacePath: string,
  options: DependencyInstallOptions = {}
): Promise<DependencyInstallResult> {
  if (!(await needsDependencyInstall(workspacePath))) {
    return { installed: false, success: true, output: "" };
  }

  const runInstall = options.install ?? (() => runNpmInstall(workspacePath));
  const result = await runInstall();
  if (!result.success) {
    return {
      installed: true,
      success: false,
      output: result.output,
      error: result.error || result.output || "npm install failed",
    };
  }

  await writePackageHash(workspacePath);
  return {
    installed: true,
    success: true,
    output: result.output,
  };
}

function runNpmInstall(workspacePath: string): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    let output = "";
    const proc = spawn("npm", ["install", "--no-audit", "--no-fund"], {
      cwd: workspacePath,
    });

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });
    proc.stderr.on("data", (data) => {
      output += data.toString();
    });

    const timeout = setTimeout(() => {
      proc.kill();
      resolve({
        success: false,
        output,
        error: "npm install timed out after 120s",
      });
    }, 120000);

    proc.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        success: code === 0,
        output,
        error: code === 0 ? undefined : `npm install exited with code ${code}`,
      });
    });

    proc.on("error", (error) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        output,
        error: error.message,
      });
    });
  });
}
