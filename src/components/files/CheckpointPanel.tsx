"use client";

import React, { useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useCheckpointStore } from "@/store/checkpointStore";
import { Button } from "@/components/ui/Button";
import { History, RotateCcw, Eye, GitCommit } from "lucide-react";
import { cn } from "@/lib/utils";

export function CheckpointPanel() {
  const checkpoints = useCheckpointStore((s) => s.checkpoints);
  const setCheckpoints = useCheckpointStore((s) => s.setCheckpoints);
  const setDiffView = useCheckpointStore((s) => s.setDiffView);
  const activeProject = useProjectStore((s) => s.activeProject);
  const turns = useProjectStore((s) => s.turns);
  const [isLoading, setIsLoading] = useState(false);

  const loadCheckpoints = async () => {
    if (!activeProject) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/checkpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", workspacePath: activeProject.workspacePath }),
      });
      const data = await res.json();
      if (data.checkpoints) {
        const mapped = data.checkpoints.map((c: { ref: string; turnCount: number }) => ({
          id: `cp-${c.turnCount}`,
          projectId: activeProject.id,
          turnCount: c.turnCount,
          ref: c.ref,
          createdAt: turns[c.turnCount]?.createdAt || Date.now(),
        }));
        setCheckpoints(mapped);
      }
    } catch (error) {
      console.error("Failed to load checkpoints:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const viewDiff = async (turnCount: number) => {
    if (!activeProject) return;
    try {
      const res = await fetch("/api/checkpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "diff", workspacePath: activeProject.workspacePath, turnCount }),
      });
      const data = await res.json();
      setDiffView({ from: 0, to: turnCount, diff: data.diff || "", files: data.files || [] });
    } catch (error) {
      console.error("Failed to load diff:", error);
    }
  };

  const revert = async (turnCount: number) => {
    if (!activeProject) return;
    if (!confirm(`Revert to turn ${turnCount}? This will undo all changes after this point.`)) return;
    try {
      const res = await fetch("/api/checkpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revert", workspacePath: activeProject.workspacePath, targetTurnCount: turnCount }),
      });
      const data = await res.json();
      if (data.success) {
        const res2 = await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "list", path: activeProject.workspacePath }),
        });
        const data2 = await res2.json();
        if (data2.entries) useProjectStore.getState().setFiles(data2.entries);
      }
    } catch (error) {
      console.error("Failed to revert:", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <History size={14} className="text-zinc-400" />
          <h2 className="text-sm font-medium text-zinc-300">History</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={loadCheckpoints} isLoading={isLoading}>
          <RotateCcw size={12} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {checkpoints.length === 0 && (
          <div className="text-center py-8 text-zinc-500 text-xs">
            No checkpoints yet.
            <br />
            They&apos;re created automatically with each turn.
          </div>
        )}

        {checkpoints.map((cp) => {
          const turn = turns.find((t) => {
            const idx = turns.indexOf(t);
            return idx === cp.turnCount;
          });
          return (
            <div
              key={cp.id}
              className="group flex items-center gap-2 px-2 py-2 rounded-lg bg-zinc-800/30 border border-zinc-800/50 hover:border-zinc-700 transition-colors"
            >
              <GitCommit size={14} className="text-violet-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-zinc-300 font-medium">Turn {cp.turnCount}</div>
                <div className="text-xs text-zinc-500 truncate">
                  {turn?.filesChanged.length || 0} file(s) changed
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => viewDiff(cp.turnCount)}
                  className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
                  title="View diff"
                >
                  <Eye size={12} />
                </button>
                <button
                  onClick={() => revert(cp.turnCount)}
                  className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-amber-400"
                  title="Revert to this checkpoint"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
