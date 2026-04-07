"use client";

import React, { useState, useEffect } from "react";
import { useProjectStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { Play, Square, ExternalLink, Loader2, AlertCircle } from "lucide-react";

export function PreviewFrame() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPreview = async () => {
    if (!activeProject) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/preview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath: activeProject.workspacePath }),
      });
      const data = await res.json();
      if (data.port) {
        setPreviewUrl(`http://localhost:${data.port}`);
        setIsRunning(true);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start preview");
    } finally {
      setIsLoading(false);
    }
  };

  const stopPreview = async () => {
    try {
      await fetch("/api/preview/stop", { method: "POST" });
    } catch {}
    setPreviewUrl(null);
    setIsRunning(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-zinc-600" />
          )}
          <span className="text-sm font-medium text-zinc-300">Preview</span>
        </div>
        <div className="flex items-center gap-1">
          {!isRunning ? (
            <Button variant="ghost" size="sm" onClick={startPreview} isLoading={isLoading}>
              <Play size={14} />
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => previewUrl && window.open(previewUrl, "_blank")}>
                <ExternalLink size={14} />
              </Button>
              <Button variant="ghost" size="sm" onClick={stopPreview}>
                <Square size={14} />
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-600/10 border-b border-red-600/20 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}

      {previewUrl ? (
        <iframe
          src={previewUrl}
          className="flex-1 w-full bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
          {isRunning ? (
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Starting preview...
            </div>
          ) : (
            "Click play to start the preview"
          )}
        </div>
      )}
    </div>
  );
}
