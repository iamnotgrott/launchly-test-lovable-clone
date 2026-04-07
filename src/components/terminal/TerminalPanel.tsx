"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";
import { Terminal, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TerminalPanelProps {
  cwd: string;
  onClose?: () => void;
}

export function TerminalPanel({ cwd, onClose }: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [command, setCommand] = useState("npm run dev");

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace",
      theme: {
        background: "#09090b",
        foreground: "#e4e4e7",
        cursor: "#8b5cf6",
        selectionBackground: "#8b5cf633",
        black: "#18181b",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#e4e4e7",
        brightBlack: "#27272a",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#facc15",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#fafafa",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    try {
      term.loadAddon(new WebglAddon());
    } catch {
      // WebGL not available, fall back to canvas
    }

    term.writeln("\x1b[35mForge Terminal\x1b[0m");
    term.writeln(`\x1b[90mWorking directory: ${cwd}\x1b[0m`);
    term.writeln("");

    xtermRef.current = term;

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      term.dispose();
    };
  }, [cwd]);

  const runCommand = async () => {
    if (!xtermRef.current || !cwd || isRunning) return;
    setIsRunning(true);

    xtermRef.current.writeln(`\n\x1b[33m$ ${command}\x1b[0m`);

    try {
      const response = await fetch("/api/terminal/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, cwd }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

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
              case "stdout":
                xtermRef.current?.write(data.data);
                break;
              case "stderr":
                xtermRef.current?.write(`\x1b[31m${data.data}\x1b[0m`);
                break;
              case "exit":
                xtermRef.current?.writeln(`\n\x1b[90mProcess exited with code ${data.code}\x1b[0m`);
                setIsRunning(false);
                break;
              case "error":
                xtermRef.current?.writeln(`\n\x1b[31mError: ${data.message}\x1b[0m`);
                setIsRunning(false);
                break;
            }
          } catch {}
        }
      }
    } catch (error) {
      xtermRef.current?.writeln(`\n\x1b[31mFailed to run command: ${error instanceof Error ? error.message : "Unknown error"}\x1b[0m`);
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <Terminal size={14} className="text-zinc-400" />
        <span className="text-xs text-zinc-400 font-mono truncate flex-1">{cwd}</span>
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runCommand()}
            disabled={isRunning}
            className="w-32 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-violet-600/50 disabled:opacity-50"
          />
          <button
            onClick={runCommand}
            disabled={isRunning}
            className="px-2 py-1 rounded bg-violet-600/20 text-violet-400 text-xs hover:bg-violet-600/30 disabled:opacity-50 transition-colors"
          >
            {isRunning ? <Loader2 size={12} className="animate-spin" /> : "Run"}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Terminal */}
      <div ref={terminalRef} className="flex-1 min-h-0" />
    </div>
  );
}
