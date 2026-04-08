"use client";

import React from "react";
import { useToastStore } from "@/store/toastStore";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast: { id: string; message: string; type: string }) => {
        const Icon =
          toast.type === "success" ? CheckCircle : toast.type === "error" ? AlertCircle : Info;
        const color =
          toast.type === "success"
            ? "bg-emerald-900/90 border-emerald-700 text-emerald-200"
            : toast.type === "error"
            ? "bg-red-900/90 border-red-700 text-red-200"
            : "bg-zinc-800/90 border-zinc-700 text-zinc-200";

        return (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm animate-in slide-in-from-right ${color}`}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span className="text-sm">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
