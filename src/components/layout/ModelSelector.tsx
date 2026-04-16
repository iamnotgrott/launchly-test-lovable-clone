"use client";

import React from "react";
import { MODELS, MODEL_NAMES } from "@/lib/openrouter/config";
import { Zap } from "lucide-react";

export function ModelSelector() {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-zinc-400">
      <Zap size={12} />
      <span>{MODEL_NAMES[MODELS.DEFAULT]}</span>
    </div>
  );
}
