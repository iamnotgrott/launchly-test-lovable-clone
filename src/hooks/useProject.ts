"use client";

import { useProjectStore } from "@/store/projectStore";

export function useProject() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const setFiles = useProjectStore((s) => s.setFiles);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);

  const refreshFiles = async () => {
    if (!activeProject) return;
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", path: activeProject.workspacePath }),
      });
      const data = await res.json();
      if (data.entries) setFiles(data.entries);
    } catch (error) {
      console.error("Failed to refresh files:", error);
    }
  };

  return { activeProject, setFiles, setActiveProject, refreshFiles };
}
