"use client";

import React, { useCallback, useState, useEffect } from "react";
import { FilePanel } from "@/components/files/FilePanel";
import { ChatView } from "@/components/chat/ChatView";
import { FileTabs } from "@/components/files/FileTabs";
import { FileEditor } from "@/components/files/FileEditor";
import { ProjectList } from "@/components/layout/ProjectList";
import { PreviewFrame } from "@/components/preview/PreviewFrame";
import { CheckpointPanel } from "@/components/files/CheckpointPanel";
import { TerminalPanel } from "@/components/terminal/TerminalPanel";
import { DiffViewer } from "@/components/diff/DiffViewer";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { useProjectStore } from "@/store/projectStore";
import { useCheckpointStore } from "@/store/checkpointStore";
import { cn } from "@/lib/utils";
import { PanelLeft, Monitor, Terminal, History, Settings, LogOut } from "lucide-react";
import { ModelSelector } from "@/components/layout/ModelSelector";
import { useAuth } from "@/hooks/useAuth";

type LeftPanel = "files" | "projects" | "history";
type RightPanel = "editor" | "preview" | "terminal" | null;

export default function Home() {
  const [leftPanel, setLeftPanel] = useState<LeftPanel>("files");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [previewAutoStartSignal, setPreviewAutoStartSignal] = useState(0);
  const activeFile = useProjectStore((s) => s.activeFile);
  const activeProject = useProjectStore((s) => s.activeProject);
  const diffView = useCheckpointStore((s) => s.diffView);
  const { user, logout } = useAuth();

  useEffect(() => {
    if (activeFile && rightPanel !== "preview") {
      setRightPanel("editor");
    }
  }, [activeFile]);

  const toggleRightPanel = (panel: RightPanel) => {
    setRightPanel((prev) => (prev === panel ? null : panel));
  };

  const handleTurnComplete = useCallback(() => {
    setRightPanel("preview");
    setPreviewAutoStartSignal(Date.now());
  }, []);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <DiffViewer />
      <ToastContainer />

      {/* Left sidebar */}
      <div
        className={cn(
          "flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col relative transition-all duration-200",
          leftCollapsed ? "w-0 overflow-hidden border-r-0" : ""
        )}
        style={{ width: leftCollapsed ? 0 : 260 }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <span className="text-sm font-semibold text-zinc-100">Forge</span>
          </div>
          <button
            onClick={() => setLeftCollapsed(true)}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <PanelLeft size={14} />
          </button>
        </div>
        <div className="flex border-b border-zinc-800">
          {(["files", "projects", "history"] as LeftPanel[]).map((panel) => (
            <button
              key={panel}
              onClick={() => setLeftPanel(panel)}
              className={cn(
                "flex-1 py-2 text-xs font-medium transition-colors capitalize",
                leftPanel === panel
                  ? "text-violet-400 border-b-2 border-violet-500"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {panel === "history" ? "History" : panel}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          {leftPanel === "files" && <FilePanel />}
          {leftPanel === "projects" && <ProjectList />}
          {leftPanel === "history" && <CheckpointPanel />}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            {leftCollapsed && (
              <button
                onClick={() => setLeftCollapsed(false)}
                className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <PanelLeft size={16} />
              </button>
            )}
            <h1 className="text-sm font-semibold text-zinc-100">
              {activeProject?.name || "Forge"}
            </h1>
            {!activeProject && (
              <span className="text-xs text-zinc-500 ml-2">Create a project to get started</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ModelSelector />
            <a
              href="/settings"
              className="p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              title="Settings"
            >
              <Settings size={14} />
            </a>
            {user && (
              <button
                onClick={logout}
                className="p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                title={`Sign out (${user.email})`}
              >
                <LogOut size={14} />
              </button>
            )}
            <button
              onClick={() => toggleRightPanel("preview")}
              className={cn(
                "p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs",
                rightPanel === "preview"
                  ? "bg-violet-600/20 text-violet-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              )}
              title="Toggle preview"
            >
              <Monitor size={14} />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={cn(
                "p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs",
                showTerminal
                  ? "bg-violet-600/20 text-violet-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              )}
              title="Toggle terminal"
            >
              <Terminal size={14} />
              <span className="hidden sm:inline">Terminal</span>
            </button>
          </div>
        </div>

        {/* File tabs */}
        {activeFile && <FileTabs />}

        {/* Content area */}
        <div className="flex-1 flex min-h-0">
          {/* Chat */}
          <div
            className={cn(
              "flex flex-col min-w-0",
              rightPanel ? "w-1/2 border-r border-zinc-800" : "w-full"
            )}
          >
            <ChatView onTurnComplete={handleTurnComplete} />
          </div>

          {/* Right panel */}
          {rightPanel === "preview" && (
            <div className="w-1/2 flex flex-col min-w-0">
              <PreviewFrame autoStartSignal={previewAutoStartSignal} />
            </div>
          )}
          {rightPanel === "editor" && activeFile && (
            <div className="w-1/2 flex flex-col min-w-0">
              <FileEditor />
            </div>
          )}
        </div>

        {/* Terminal drawer */}
        {showTerminal && activeProject && (
          <div className="h-64 border-t border-zinc-800 flex-shrink-0">
            <TerminalPanel
              cwd={activeProject.workspacePath}
              onClose={() => setShowTerminal(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
