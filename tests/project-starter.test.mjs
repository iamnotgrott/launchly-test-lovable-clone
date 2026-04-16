import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ensureDependenciesInstalled,
  ensureStarterProject,
  needsDependencyInstall,
} from "../src/lib/projects/starter.ts";

async function makeTempWorkspace() {
  return fs.mkdtemp(path.join(os.tmpdir(), "forge-starter-"));
}

test("ensureStarterProject creates a runnable Vite React scaffold in an empty workspace", async () => {
  const workspace = await makeTempWorkspace();

  const result = await ensureStarterProject(workspace);

  assert.equal(result.scaffolded, true);
  assert.deepEqual(
    result.filesCreated.sort(),
    [
      "index.html",
      "package.json",
      "src/App.css",
      "src/App.tsx",
      "src/main.tsx",
      "tsconfig.json",
      "vite.config.ts",
    ].sort()
  );

  const pkg = JSON.parse(await fs.readFile(path.join(workspace, "package.json"), "utf8"));
  assert.equal(pkg.scripts.dev, "vite");
  assert.equal(pkg.scripts.build, "vite build");
  assert.equal(pkg.dependencies.react, "^19.2.0");
  assert.match(await fs.readFile(path.join(workspace, "src", "App.tsx"), "utf8"), /export default function App/);
});

test("ensureStarterProject does not overwrite existing app files", async () => {
  const workspace = await makeTempWorkspace();
  await fs.mkdir(path.join(workspace, "src"), { recursive: true });
  await fs.writeFile(path.join(workspace, "src", "App.tsx"), "export default function App() { return null; }\n");

  await ensureStarterProject(workspace);

  assert.equal(
    await fs.readFile(path.join(workspace, "src", "App.tsx"), "utf8"),
    "export default function App() { return null; }\n"
  );
});

test("needsDependencyInstall tracks node_modules and package.json changes", async () => {
  const workspace = await makeTempWorkspace();
  await ensureStarterProject(workspace);

  assert.equal(await needsDependencyInstall(workspace), true);

  await fs.mkdir(path.join(workspace, "node_modules"), { recursive: true });
  await ensureDependenciesInstalled(workspace, {
    install: async () => ({ success: true, output: "mock install" }),
  });

  assert.equal(await needsDependencyInstall(workspace), false);

  const packagePath = path.join(workspace, "package.json");
  const pkg = JSON.parse(await fs.readFile(packagePath, "utf8"));
  pkg.dependencies["lucide-react"] = "^1.7.0";
  await fs.writeFile(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

  assert.equal(await needsDependencyInstall(workspace), true);
});
