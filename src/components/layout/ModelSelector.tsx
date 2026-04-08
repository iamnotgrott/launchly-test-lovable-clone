"use client";

import React, { useState, useRef, useEffect } from "react";
import { MODELS, MODEL_NAMES, MODEL_DESCRIPTIONS, ModelId } from "@/lib/openrouter/config";
import { cn } from "@/lib/utils";
import { ChevronDown, Zap } from "lucide-react";

const ALL_MODELS: ModelId[] = [MODELS.DEFAULT, MODELS.FALLBACK, MODELS.FAST];

export function ModelSelector() {
  const [selected, setSelected] = useState<ModelId>(MODELS.DEFAULT);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("forge_model") as ModelId | null;
    if (saved && ALL_MODELS.includes(saved)) setSelected(saved);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (model: ModelId) => {
    setSelected(model);
    localStorage.setItem("forge_model", model);
    setIsOpen(false);
  };

  const shortName = MODEL_NAMES[selected]?.split(" ").pop() || "Model";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
      >
        <Zap size={12} />
        <span>{shortName}</span>
        <ChevronDown size={10} className={cn("transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-800">
            <span className="text-xs font-medium text-zinc-400">Model</span>
          </div>
          {ALL_MODELS.map((model) => (
            <button
              key={model}
              onClick={() => handleSelect(model)}
              className={cn(
                "w-full text-left px-3 py-2.5 hover:bg-zinc-800 transition-colors",
                selected === model && "bg-violet-600/10"
              )}
            >
              <div className={cn(
                "text-sm font-medium",
                selected === model ? "text-violet-300" : "text-zinc-200"
              )}>
                {MODEL_NAMES[model]}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {MODEL_DESCRIPTIONS[model]}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
