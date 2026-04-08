"use client";

import React, { useEffect, useState, useRef } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useToastStore } from "@/store/toastStore";

export function FileEditor() {
  const activeFile = useProjectStore((s) => s.activeFile);
  const fileContents = useProjectStore((s) => s.fileContents);
  const setFileContents = useProjectStore((s) => s.setFileContents);
  const activeProject = useProjectStore((s) => s.activeProject);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  const content = activeFile ? fileContents[activeFile] || "" : "";

  useEffect(() => {
    if (!activeFile || !activeProject) return;
    const fullPath = `${activeProject.workspacePath}/${activeFile}`;
    fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", path: fullPath }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.content !== undefined && !fileContents[activeFile]) {
          setFileContents(activeFile, data.content);
        }
      })
      .catch(() => {});
  }, [activeFile, activeProject]);

  const handleChange = (value: string) => {
    setFileContents(activeFile!, value);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!activeFile || !activeProject || isSaving) return;
    setIsSaving(true);
    try {
      const fullPath = `${activeProject.workspacePath}/${activeFile}`;
      await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "write", path: fullPath, content }),
      });
      setSaved(true);
      addToast("File saved", "success");
    } catch (error) {
      addToast("Failed to save file", "error");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [content, activeFile, activeProject]);

  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const getLanguage = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const map: Record<string, string> = {
      ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
      css: "css", html: "html", json: "json", md: "markdown",
      py: "python", rs: "rust", go: "go", rb: "ruby",
    };
    return map[ext] || "plaintext";
  };

  if (!activeFile) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        Select a file to edit
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-mono">{activeFile}</span>
          <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
            {getLanguage(activeFile)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${saved ? "text-zinc-600" : "text-amber-400"}`}>
            {saved ? "Saved" : "Unsaved"}
          </span>
          <button
            onClick={handleSave}
            disabled={isSaving || saved}
            className="text-xs px-2 py-1 rounded bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      <div className="relative flex-1">
        <div
          ref={highlightRef}
          className="absolute inset-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <pre className="p-4 text-sm font-mono leading-relaxed text-transparent whitespace-pre">
            {content || "\n"}
          </pre>
        </div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          onScroll={handleScroll}
          className="absolute inset-0 w-full h-full bg-zinc-950 text-zinc-100 font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed whitespace-pre"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
        />
      </div>
    </div>
  );
}
