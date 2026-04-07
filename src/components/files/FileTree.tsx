"use client";

import React from "react";
import { FileEntry } from "@/types";
import { FileText, Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileTreeProps {
  entries: FileEntry[];
  activeFile: string | null;
  onFileClick: (path: string) => void;
}

function TreeItem({
  entry,
  depth,
  activeFile,
  onFileClick,
}: {
  entry: FileEntry;
  depth: number;
  activeFile: string | null;
  onFileClick: (path: string) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(depth < 1);
  const isActive = entry.path === activeFile;

  if (entry.isDirectory) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 w-full px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800/50 rounded-md transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {isOpen ? <FolderOpen size={14} className="text-amber-400" /> : <Folder size={14} className="text-amber-400" />}
          <span className="truncate">{entry.name}</span>
        </button>
        {isOpen && entry.children && (
          <div>
            {entry.children.map((child) => (
              <TreeItem
                key={child.path}
                entry={child}
                depth={depth + 1}
                activeFile={activeFile}
                onFileClick={onFileClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onFileClick(entry.path)}
      className={cn(
        "flex items-center gap-1.5 w-full px-2 py-1 text-sm rounded-md transition-colors",
        isActive ? "bg-violet-600/20 text-violet-300" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
      )}
      style={{ paddingLeft: `${depth * 12 + 24}px` }}
    >
      <FileText size={14} />
      <span className="truncate">{entry.name}</span>
    </button>
  );
}

export function FileTree({ entries, activeFile, onFileClick }: FileTreeProps) {
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No files yet
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full py-1">
      {entries.map((entry) => (
        <TreeItem
          key={entry.path}
          entry={entry}
          depth={0}
          activeFile={activeFile}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
}
