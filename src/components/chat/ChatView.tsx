"use client";

import React, { useRef, useCallback } from "react";
import { MessageList } from "./MessageList";
import { Composer } from "./Composer";
import { useChatStore } from "@/store/chatStore";

interface ChatViewProps {
  onTurnComplete?: () => void;
}

export function ChatView({ onTurnComplete }: ChatViewProps) {
  const clearChat = useChatStore((s) => s.clearChat);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleMessageSent = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-300">Chat</h2>
        <button
          onClick={clearChat}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Clear
        </button>
      </div>
      <MessageList scrollRef={scrollRef} />
      <Composer onMessageSent={handleMessageSent} onTurnComplete={onTurnComplete} />
    </div>
  );
}
