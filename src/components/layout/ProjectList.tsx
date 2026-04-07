"use client";

import React, { useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { FolderPlus, Loader2 } from "lucide-react";

export function ProjectList() {
  const projects = useProjectStore((s) => s.projects);
  const activeProject = useProjectStore((s) => s.activeProject);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const setProjects = useProjectStore((s) => s.setProjects);
  const setFiles = useProjectStore((s) => s.setFiles);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      const data = await res.json();
      if (data.project) {
        setProjects([...projects, data.project]);
        setActiveProject(data.project);
        setFiles(data.files || []);
        setNewProjectName("");
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const selectProject = (project: typeof activeProject) => {
    if (!project) return;
    setActiveProject(project);
    fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", path: project.workspacePath }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.entries) setFiles(data.entries);
      })
      .catch(() => {});
  };

  return (
    <div className="flex flex-col h-full p-3 gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createProject()}
          placeholder="New project name..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-600/50"
        />
        <Button size="sm" onClick={createProject} isLoading={isCreating}>
          <FolderPlus size={14} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {projects.length === 0 && (
          <div className="text-center py-8 text-zinc-500 text-xs">
            No projects yet.
            <br />
            Create one to get started.
          </div>
        )}
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => selectProject(project)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activeProject?.id === project.id
                ? "bg-violet-600/20 text-violet-300 border border-violet-600/30"
                : "text-zinc-300 hover:bg-zinc-800 border border-transparent"
            }`}
          >
            <div className="font-medium truncate">{project.name}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {new Date(project.createdAt).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
