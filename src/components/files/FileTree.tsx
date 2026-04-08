"use client";

import React, { useState } from "react";
import { FileEntry } from "@/types";
import { FileText, Folder, FolderOpen, ChevronRight, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileTreeProps {
  entries: FileEntry[];
  activeFile: string | null;
  onFileClick: (path: string) => void;
}

function flattenEntries(entries: FileEntry[]): FileEntry[] {
  const result: FileEntry[] = [];
  function walk(items: FileEntry[]) {
    for (const item of items) {
      result.push(item);
      if (item.isDirectory && item.children) {
        walk(item.children);
      }
    }
  }
  walk(entries);
  return result;
}

function filterEntries(entries: FileEntry[], query: string): FileEntry[] {
  if (!query) return entries;
  const lower = query.toLowerCase();
  return entries
    .map((entry) => {
      if (entry.isDirectory && entry.children) {
        const filtered = filterEntries(entry.children, query);
        if (filtered.length > 0) {
          return { ...entry, children: filtered };
        }
        if (entry.name.toLowerCase().includes(lower)) {
          return entry;
        }
        return null;
      }
      if (entry.name.toLowerCase().includes(lower)) {
        return entry;
      }
      return null;
    })
    .filter(Boolean) as FileEntry[];
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
  const [search, setSearch] = useState("");

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No files yet
      </div>
    );
  }

  const filtered = filterEntries(entries, search);

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-1.5 border-b border-zinc-800/50">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter files..."
            className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-md pl-7 pr-2 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-600/50"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-4 py-3 text-xs text-zinc-500">No files match &ldquo;{search}&rdquo;</div>
        ) : (
          filtered.map((entry) => (
            <TreeItem
              key={entry.path}
              entry={entry}
              depth={0}
              activeFile={activeFile}
              onFileClick={onFileClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
