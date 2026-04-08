import { create } from "zustand";
import { ChatState, Message } from "@/types";

interface ChatStore extends ChatState {
  addMessage: (message: Omit<Message, "id" | "createdAt">) => void;
  updateStreamingMessage: (turnId: string, content: string, done: boolean) => void;
  setStreaming: (isStreaming: boolean) => void;
  setCurrentTurnId: (turnId: string | undefined) => void;
  setPlanText: (plan: string | undefined) => void;
  setIsPlanning: (isPlanning: boolean) => void;
  clearChat: () => void;
  pendingSuggestion: string | null;
  setSuggestion: (text: string | null) => void;
}

const initialState: ChatState & { pendingSuggestion: string | null } = {
  messages: [],
  isStreaming: false,
  isPlanning: false,
  pendingSuggestion: null,
};

export const useChatStore = create<ChatStore>((set) => ({
  ...initialState,

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        },
      ],
    })),

  updateStreamingMessage: (turnId, content, done) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.turnId === turnId && m.isStreaming
          ? { ...m, content: done ? m.content : m.content + content, isStreaming: !done }
          : m
      ),
      isStreaming: !done,
    })),

  setStreaming: (isStreaming) => set({ isStreaming }),
  setCurrentTurnId: (turnId) => set({ currentTurnId: turnId }),
  setPlanText: (plan) => set({ planText: plan }),
  setIsPlanning: (isPlanning) => set({ isPlanning }),

  clearChat: () => set(initialState),
  pendingSuggestion: null,
  setSuggestion: (text) => set({ pendingSuggestion: text }),
}));
