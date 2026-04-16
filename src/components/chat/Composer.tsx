"use client";

import React, { useState, useEffect } from "react";
import { Send, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useChatStore } from "@/store/chatStore";
import { useProjectStore } from "@/store/projectStore";
import { useToastStore } from "@/store/toastStore";
import { usePersistence } from "@/hooks/PersistenceContext";

interface ComposerProps {
  onMessageSent: () => void;
  onTurnComplete?: () => void;
}

export function Composer({ onMessageSent, onTurnComplete }: ComposerProps) {
  const [input, setInput] = useState("");
  const isStreaming = useChatStore((s) => s.isStreaming);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateStreamingMessage = useChatStore((s) => s.updateStreamingMessage);
  const pendingSuggestion = useChatStore((s) => s.pendingSuggestion);
  const setSuggestion = useChatStore((s) => s.setSuggestion);
  const activeProject = useProjectStore((s) => s.activeProject);
  const setFiles = useProjectStore((s) => s.setFiles);
  const addTurn = useProjectStore((s) => s.addTurn);
  const updateTurn = useProjectStore((s) => s.updateTurn);
  const addToast = useToastStore((s) => s.addToast);
  const { persistMessage, persistTurn, updateTurn: persistTurnUpdate } = usePersistence();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("forge_chat_input");
    if (saved && !activeProject) setInput(saved);
  }, []);

  useEffect(() => {
    if (pendingSuggestion) {
      setInput(pendingSuggestion);
      setSuggestion(null);
    }
  }, [pendingSuggestion, setSuggestion]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isStreaming) {
      localStorage.setItem("forge_chat_input", input);
    }
  }, [input, isStreaming]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeProject || isStreaming) return;

    const apiKey = localStorage.getItem("openrouter_api_key");
    if (!apiKey) {
      addToast("Please set your OpenRouter API key in Settings first", "error");
      return;
    }

    const userMessage = input.trim();
    setInput("");
    localStorage.removeItem("forge_chat_input");

    const turnId = crypto.randomUUID();

    addMessage({
      role: "user",
      content: userMessage,
      turnId,
      isStreaming: false,
    });

    addMessage({
      role: "assistant",
      content: "",
      turnId,
      isStreaming: true,
    });

    addTurn({
      id: turnId,
      projectId: activeProject.id,
      userMessage,
      status: "executing",
      filesChanged: [],
      retryCount: 0,
      createdAt: Date.now(),
    });

    const pid = activeProject._id || activeProject.id;
    persistMessage({ projectId: pid, role: "user", content: userMessage, turnId, isStreaming: false });
    persistTurn({ projectId: pid, userMessage, status: "executing" });

    const chatHistory = useChatStore
      .getState()
      .messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    try {
      const response = await fetch("/api/turn/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OpenRouter-Key": apiKey,
        },
        body: JSON.stringify({
          workspacePath: activeProject.workspacePath,
          userMessage,
          chatHistory,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        if (response.status === 429) {
          throw new Error("Rate limited. Please wait a moment and try again.");
        }
        throw new Error(`Server error: ${response.status} — ${errorBody.slice(0, 200)}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));

            switch (data.type) {
              case "stream":
                updateStreamingMessage(turnId, data.content, false);
                break;
              case "complete": {
                updateStreamingMessage(turnId, "", true);
                const completedAt = Date.now();
                updateTurn(turnId, {
                  status: "completed",
                  filesChanged: data.filesChanged || [],
                  completedAt,
                });
                const assistantContent = useChatStore.getState().messages.find(
                  (m) => m.turnId === turnId && m.role === "assistant"
                )?.content || "";
                persistMessage({
                  projectId: pid,
                  role: "assistant",
                  content: assistantContent,
                  turnId,
                  isStreaming: false,
                  model: data.model,
                  promptTokens: data.tokenUsage?.prompt,
                  completionTokens: data.tokenUsage?.completion,
                });
                persistTurnUpdate(turnId, {
                  status: "completed",
                  filesChanged: data.filesChanged || [],
                  model: data.model,
                  promptTokens: data.tokenUsage?.prompt,
                  completionTokens: data.tokenUsage?.completion,
                  completedAt,
                });
                if (data.tokenUsage) {
                  useChatStore.getState().messages.forEach((m) => {
                    if (m.turnId === turnId && m.role === "assistant") {
                      useChatStore.getState().addMessage({
                        role: "system",
                        content: `Used ${data.tokenUsage.prompt + data.tokenUsage.completion} tokens (${data.model?.split("/").pop() || "unknown"})`,
                        turnId,
                        isStreaming: false,
                        model: data.model,
                        tokenUsage: data.tokenUsage,
                      });
                    }
                  });
                }
                refreshFiles();
                addToast("Changes applied successfully", "success");
                onMessageSent();
                onTurnComplete?.();
                break;
              }
              case "failed": {
                updateStreamingMessage(
                  turnId,
                  `\n\nError: ${data.errorMessage || "Unknown error"}`,
                  true
                );
                const failedAt = Date.now();
                updateTurn(turnId, {
                  status: "failed",
                  errorMessage: data.errorMessage,
                  filesChanged: data.filesChanged || [],
                  completedAt: failedAt,
                });
                persistTurnUpdate(turnId, {
                  status: "failed",
                  errorMessage: data.errorMessage,
                  filesChanged: data.filesChanged || [],
                  completedAt: failedAt,
                });
                addToast(data.errorMessage || "Turn failed", "error");
                break;
              }
              case "plan_start":
                updateStreamingMessage(turnId, "Planning changes...\n\n", false);
                break;
              case "plan_complete":
                updateStreamingMessage(turnId, `Plan:\n${data.content}\n\nExecuting...\n\n`, false);
                break;
              case "execute_start":
                break;
              case "setup_start":
                updateStreamingMessage(turnId, "Preparing project...\n", false);
                break;
              case "setup_complete":
                if (data.scaffolded || data.dependenciesInstalled) {
                  updateStreamingMessage(turnId, "Project ready.\n", false);
                }
                break;
              case "error":
                updateStreamingMessage(turnId, `\n\nError: ${data.message}\n`, false);
                break;
              case "checkpoint_start":
                updateStreamingMessage(turnId, "Creating checkpoint...\n", false);
                break;
              case "checkpoint_complete":
                break;
              case "build_start":
                updateStreamingMessage(turnId, "\nRunning build...\n", false);
                break;
              case "build_error":
                updateStreamingMessage(turnId, `\nBuild failed. Attempting repair...\n`, false);
                break;
              case "stream_error":
                updateStreamingMessage(turnId, `\nStreaming failed (${data.message}), falling back...\n`, false);
                break;
              case "heartbeat":
                break;
            }
          } catch {
            // skip malformed SSE events
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      updateStreamingMessage(turnId, `\n\nError: ${errorMsg}`, true);
      updateTurn(turnId, {
        status: "failed",
        errorMessage: errorMsg,
        completedAt: Date.now(),
      });
      addToast(errorMsg, "error");
    }
  };

  const refreshFiles = async () => {
    if (!activeProject) return;
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", path: activeProject.workspacePath }),
      });
      const data = await res.json();
      if (data.entries) setFiles(data.entries);
    } catch {}
  };

  const hasApiKey = typeof window !== "undefined" && !!localStorage.getItem("openrouter_api_key");

  return (
    <div className="border-t border-zinc-800">
      {!hasApiKey && activeProject && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-600/10 border-b border-amber-600/20">
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
          <span className="text-xs text-amber-400 flex-1">
            No API key configured.{" "}
            <a href="/settings" className="underline hover:text-amber-300">
              Set it in Settings
            </a>
          </span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeProject
                ? "Describe what you want to build or change..."
                : "Select or create a project first"
            }
            disabled={isStreaming || !activeProject}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-600/50 focus:border-violet-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button type="submit" disabled={!input.trim() || isStreaming || !activeProject} className="rounded-xl">
            {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
        <div className="max-w-3xl mx-auto mt-1.5 px-1">
          <span className="text-xs text-zinc-600">
            Press Enter to send
          </span>
        </div>
      </form>
    </div>
  );
}
