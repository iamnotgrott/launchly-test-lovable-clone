"use client";

import React from "react";
import { useCheckpointStore } from "@/store/checkpointStore";
import { X, ChevronDown, ChevronUp, FilePlus, FileMinus, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";

export function DiffViewer() {
  const diffView = useCheckpointStore((s) => s.diffView);
  const setDiffView = useCheckpointStore((s) => s.setDiffView);

  if (!diffView) return null;

  const [expandedFiles, setExpandedFiles] = React.useState<Set<string>>(new Set());

  const toggleFile = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const diffLines = diffView.diff.split("\n");

  const getFileDiff = (filePath: string): string[] => {
    const lines: string[] = [];
    let inFile = false;
    for (const line of diffLines) {
      if (line.startsWith("diff --git")) {
        const match = line.match(/b\/(.+)$/);
        inFile = match?.[1] === filePath;
        if (inFile) lines.push(line);
      } else if (inFile) {
        if (line.startsWith("diff --git")) break;
        lines.push(line);
      }
    }
    return lines;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Diff: Turn 0 → {diffView.to}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {diffView.files.length} file(s) changed
            </p>
          </div>
          <button
            onClick={() => setDiffView(null)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          {diffView.files.length === 0 && (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
              No changes to display
            </div>
          )}

          {diffView.files.map((file) => {
            const isExpanded = expandedFiles.has(file.path);
            const fileDiff = getFileDiff(file.path);
            const icon =
              file.status === "added" ? (
                <FilePlus size={14} className="text-emerald-400" />
              ) : file.status === "deleted" ? (
                <FileMinus size={14} className="text-red-400" />
              ) : (
                <FileEdit size={14} className="text-amber-400" />
              );

            return (
              <div key={file.path} className="border-b border-zinc-800/50">
                <button
                  onClick={() => toggleFile(file.path)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-zinc-800/30 transition-colors"
                >
                  {icon}
                  <span className="text-sm text-zinc-200 font-mono flex-1 text-left truncate">
                    {file.path}
                  </span>
                  <span className="text-xs text-emerald-400">+{file.additions}</span>
                  <span className="text-xs text-red-400">-{file.deletions}</span>
                  {isExpanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                </button>

                {isExpanded && (
                  <div className="bg-zinc-950 border-t border-zinc-800/50 overflow-x-auto">
                    <pre className="text-xs font-mono p-3 leading-relaxed">
                      {fileDiff.map((line, i) => {
                        let color = "text-zinc-400";
                        if (line.startsWith("+") && !line.startsWith("+++")) color = "text-emerald-400";
                        else if (line.startsWith("-") && !line.startsWith("---")) color = "text-red-400";
                        else if (line.startsWith("@@")) color = "text-violet-400";
                        else if (line.startsWith("diff") || line.startsWith("index")) color = "text-zinc-500";
                        return (
                          <div key={i} className={cn(color, line.startsWith("+") || line.startsWith("-") ? "bg-zinc-900/50 -mx-3 px-3" : "")}>
                            {line || " "}
                          </div>
                        );
                      })}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
