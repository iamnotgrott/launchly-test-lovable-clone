"use client";

import React from "react";
import { Message } from "@/types";
import { formatTime } from "@/lib/utils";
import { Bot, User, Zap } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/40 border border-zinc-700/30 text-xs text-zinc-500">
          <Zap size={10} />
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""} group`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isUser ? "bg-violet-600/20 text-violet-400" : "bg-emerald-600/20 text-emerald-400"
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-violet-600 text-white rounded-tr-sm"
              : "bg-zinc-800 text-zinc-100 rounded-tl-sm"
          }`}
        >
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 bg-violet-400 ml-1 animate-pulse" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-zinc-500">{formatTime(message.createdAt)}</span>
          {message.model && (
            <span className="text-xs text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded">
              {message.model.split("/").pop()}
            </span>
          )}
          {message.tokenUsage && (
            <span className="flex items-center gap-0.5 text-xs text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded">
              <Zap size={10} />
              {message.tokenUsage.prompt + message.tokenUsage.completion} tokens
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
