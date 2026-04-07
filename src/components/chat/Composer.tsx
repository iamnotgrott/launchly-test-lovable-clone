"use client";

import React, { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useChatStore } from "@/store/chatStore";
import { useProjectStore } from "@/store/projectStore";

interface ComposerProps {
  onMessageSent: () => void;
}

export function Composer({ onMessageSent }: ComposerProps) {
  const [input, setInput] = useState("");
  const isStreaming = useChatStore((s) => s.isStreaming);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateStreamingMessage = useChatStore((s) => s.updateStreamingMessage);
  const activeProject = useProjectStore((s) => s.activeProject);
  const setFiles = useProjectStore((s) => s.setFiles);
  const addTurn = useProjectStore((s) => s.addTurn);
  const updateTurn = useProjectStore((s) => s.updateTurn);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeProject || isStreaming) return;

    const userMessage = input.trim();
    setInput("");

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

    const chatHistory = useChatStore
      .getState()
      .messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    try {
      const apiKey = localStorage.getItem("openrouter_api_key") || "";
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
        throw new Error(`Server error: ${response.status}`);
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
              case "complete":
                updateStreamingMessage(turnId, "", true);
                updateTurn(turnId, {
                  status: "completed",
                  filesChanged: data.filesChanged || [],
                  completedAt: Date.now(),
                });
                refreshFiles();
                onMessageSent();
                break;
              case "failed":
                updateStreamingMessage(
                  turnId,
                  `\n\nError: ${data.errorMessage || "Unknown error"}`,
                  true
                );
                updateTurn(turnId, {
                  status: "failed",
                  errorMessage: data.errorMessage,
                  filesChanged: data.filesChanged || [],
                  completedAt: Date.now(),
                });
                break;
              case "plan_start":
                updateStreamingMessage(turnId, "Planning changes...\n\n", false);
                break;
              case "plan_complete":
                updateStreamingMessage(turnId, `Plan:\n${data.content}\n\nExecuting...\n\n`, false);
                break;
              case "execute_start":
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

  return (
    <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-4">
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
    </form>
  );
}
