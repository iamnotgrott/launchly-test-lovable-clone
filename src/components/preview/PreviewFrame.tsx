"use client";

import React, { useState, useRef, useEffect } from "react";
import { useProjectStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { Play, Square, ExternalLink, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { PreviewSkeleton } from "@/components/ui/Skeleton";

export function PreviewFrame() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const retryCount = useRef(0);

  const startPreview = async () => {
    if (!activeProject) return;
    setIsLoading(true);
    setError(null);
    setIframeLoaded(false);
    setIframeError(false);
    retryCount.current = 0;

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
    setIframeLoaded(false);
    setIframeError(false);
  };

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    setIframeError(false);
    retryCount.current = 0;
  };

  const handleIframeError = () => {
    if (retryCount.current < 3) {
      retryCount.current++;
      setIframeError(true);
      setTimeout(() => {
        if (iframeRef.current && previewUrl) {
          iframeRef.current.src = previewUrl;
        }
      }, 2000 * retryCount.current);
    } else {
      setIframeError(false);
      setError("Preview failed to load. The dev server may have crashed. Try restarting.");
    }
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
          {previewUrl && (
            <span className="text-xs text-zinc-500 font-mono">:{previewUrl.split(":").pop()}</span>
          )}
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
          <span className="text-xs text-red-400 flex-1 truncate">{error}</span>
          {isRunning && (
            <button
              onClick={startPreview}
              className="text-xs text-red-300 hover:text-red-200 flex items-center gap-1"
            >
              <RefreshCw size={12} />
              Restart
            </button>
          )}
        </div>
      )}

      {previewUrl ? (
        <div className="flex-1 relative">
          {!iframeLoaded && !iframeError && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10">
              <div className="text-center">
                <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
                <p className="text-xs text-zinc-500">Loading preview...</p>
                {retryCount.current > 0 && (
                  <p className="text-xs text-zinc-600 mt-1">Retry {retryCount.current}/3</p>
                )}
              </div>
            </div>
          )}
          {iframeError && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10">
              <div className="text-center">
                <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
                <p className="text-xs text-amber-400">Waiting for dev server...</p>
                <p className="text-xs text-zinc-600 mt-1">Retry {retryCount.current}/3</p>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="flex-1 w-full h-full bg-white"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      ) : isLoading ? (
        <PreviewSkeleton />
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
          Click play to start the preview
        </div>
      )}
    </div>
  );
}
