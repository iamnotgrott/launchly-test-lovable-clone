"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Settings, Key, Database, Trash2, Save, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "api" | "data">("general");

  useEffect(() => {
    const savedKey = localStorage.getItem("openrouter_api_key");
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      localStorage.removeItem("openrouter_api_key");
      setApiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }
    localStorage.setItem("openrouter_api_key", apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearData = () => {
    if (confirm("Clear all local data? This cannot be undone.")) {
      localStorage.clear();
      setApiKey("");
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <div className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <span className="text-sm font-semibold">Forge</span>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {([
            { id: "general" as const, label: "General", icon: Settings },
            { id: "api" as const, label: "API Keys", icon: Key },
            { id: "data" as const, label: "Data", icon: Database },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                activeTab === tab.id
                  ? "bg-violet-600/20 text-violet-300"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-8">
          <h1 className="text-xl font-semibold text-zinc-100 mb-6">
            {activeTab === "general" && "General Settings"}
            {activeTab === "api" && "API Configuration"}
            {activeTab === "data" && "Data Management"}
          </h1>

          {activeTab === "general" && (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h2 className="text-sm font-medium text-zinc-200 mb-3">About Forge</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Forge is an AI-powered app builder. Describe what you want in natural language,
                  and the system generates code, creates files, and helps you iterate through chat.
                </p>
                <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                  <span>Version 0.1.0</span>
                  <span>•</span>
                  <span>Next.js 16</span>
                  <span>•</span>
                  <span>OpenRouter</span>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h2 className="text-sm font-medium text-zinc-200 mb-3">Models</h2>
                <div className="space-y-3">
                  {[
                    { name: "Qwen 3.6 Plus", id: "qwen/qwen3.6-plus:free", usage: "Default — chat & code generation" },
                    { name: "Step 3.5 Flash", id: "stepfun/step-3.5-flash:free", usage: "Fast — planning & summaries" },
                    { name: "Nemotron Super 120B", id: "nvidia/nemotron-3-super-120b-a12b:free", usage: "Fallback — error repair & heavy reasoning" },
                  ].map((model) => (
                    <div key={model.id} className="flex items-start justify-between py-2 border-b border-zinc-800/50 last:border-0">
                      <div>
                        <div className="text-sm text-zinc-200">{model.name}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-0.5">{model.id}</div>
                      </div>
                      <div className="text-xs text-zinc-500">{model.usage}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "api" && (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h2 className="text-sm font-medium text-zinc-200 mb-3">OpenRouter API Key</h2>
                <p className="text-xs text-zinc-500 mb-4">
                  Get your API key at{" "}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:underline"
                  >
                    openrouter.ai/keys
                  </a>
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveApiKey();
                      }}
                      placeholder="sk-or-v1-..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-600/50 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <Button onClick={handleSaveApiKey}>
                    <Save size={14} />
                    {saved ? "Saved" : "Save"}
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-zinc-600">
                    Key is stored locally in your browser.
                  </p>
                  {apiKey && (
                    <p className="text-xs text-emerald-400">
                      API key configured
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h2 className="text-sm font-medium text-zinc-200 mb-3">Local Storage</h2>
                <p className="text-xs text-zinc-500 mb-4">
                  Clear all locally stored data including projects, preferences, and API keys.
                </p>
                <Button variant="danger" onClick={handleClearData}>
                  <Trash2 size={14} />
                  Clear All Data
                </Button>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h2 className="text-sm font-medium text-zinc-200 mb-3">Project Files</h2>
                <p className="text-xs text-zinc-500 mb-4">
                  Project files are stored on your local filesystem, not in the browser.
                </p>
                <div className="text-xs text-zinc-600 font-mono bg-zinc-800/50 rounded-lg px-3 py-2">
                  ~/.ai-app-builder/projects/
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
