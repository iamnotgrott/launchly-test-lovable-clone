"use client";

import React, { useEffect, useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileTabs() {
  const openFiles = useProjectStore((s) => s.openFiles);
  const activeFile = useProjectStore((s) => s.activeFile);
  const setActiveFile = useProjectStore((s) => s.setActiveFile);
  const closeFile = useProjectStore((s) => s.closeFile);

  if (openFiles.length === 0) return null;

  return (
    <div className="flex items-center bg-zinc-900 border-b border-zinc-800 overflow-x-auto">
      {openFiles.map((file) => {
        const name = file.split("/").pop() || file;
        return (
          <button
            key={file}
            onClick={() => setActiveFile(file)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-xs border-r border-zinc-800 transition-colors whitespace-nowrap",
              activeFile === file
                ? "bg-zinc-800 text-zinc-100 border-b-2 border-b-violet-500"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            )}
          >
            {name}
            <span
              onClick={(e) => {
                e.stopPropagation();
                closeFile(file);
              }}
              className="ml-1 p-0.5 rounded hover:bg-zinc-700"
            >
              <X size={12} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
