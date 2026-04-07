"use client";

import React from "react";
import { MessageBubble } from "./MessageBubble";
import { useChatStore } from "@/store/chatStore";

export function MessageList() {
  const messages = useChatStore((s) => s.messages);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-600/20 to-emerald-600/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">What would you like to build?</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Describe your app in natural language. I&apos;ll generate the code, create files, and help you iterate until it&apos;s perfect.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-2 text-left">
            {[
              "Build me a landing page for a fitness app with pricing and testimonials",
              "Create a todo app with drag-and-drop and local storage",
              "Make a dashboard with charts and a dark theme",
            ].map((suggestion) => (
              <button
                key={suggestion}
                className="text-left px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 text-sm hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
