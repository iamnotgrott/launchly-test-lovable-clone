"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarProps {
  children: React.ReactNode;
  defaultWidth?: number;
}

export function Sidebar({ children, defaultWidth = 260 }: SidebarProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [collapsed, setCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(400, e.clientX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => setIsResizing(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      className={cn(
        "flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col relative transition-all duration-200",
        collapsed ? "w-0 overflow-hidden" : ""
      )}
      style={{ width: collapsed ? 0 : width }}
    >
      {children}
      <div
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-violet-600/30 transition-colors z-10"
      />
    </div>
  );
}

export function SidebarToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
    >
      {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
    </button>
  );
}
