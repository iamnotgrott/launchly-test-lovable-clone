"use client";

import React, { useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { FileTree } from "./FileTree";
import { FolderTree, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileTreeSkeleton } from "@/components/ui/Skeleton";

export function FilePanel() {
  const files = useProjectStore((s) => s.files);
  const activeFile = useProjectStore((s) => s.activeFile);
  const openFile = useProjectStore((s) => s.openFile);
  const setFiles = useProjectStore((s) => s.setFiles);
  const activeProject = useProjectStore((s) => s.activeProject);
  const [isLoading, setIsLoading] = useState(false);

  const refreshFiles = async () => {
    if (!activeProject) return;
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <FolderTree size={14} className="text-zinc-400" />
          <h2 className="text-sm font-medium text-zinc-300">Files</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={refreshFiles} isLoading={isLoading}>
          <RefreshCw size={12} />
        </Button>
      </div>
      {isLoading && files.length === 0 ? (
        <FileTreeSkeleton />
      ) : (
        <FileTree entries={files} activeFile={activeFile} onFileClick={openFile} />
      )}
    </div>
  );
}
