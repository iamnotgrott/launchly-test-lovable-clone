"use client";

import { useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useProjectStore } from "@/store/projectStore";
import { useChatStore } from "@/store/chatStore";
import { useCheckpointStore } from "@/store/checkpointStore";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Must only be rendered inside a <ConvexProvider>.
 * Hydrates Zustand stores from Convex and returns persist helpers.
 */
export function useConvexPersistence() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const hydratedProjectRef = useRef<string | null>(null);

  const projectId = (activeProject as any)?._id as Id<"projects"> | undefined;

  const projects = useQuery(api.projects.listByUser, {});
  const messages = useQuery(
    api.messages.listByProject,
    projectId ? { projectId } : "skip"
  );
  const turns = useQuery(
    api.turns.listByProject,
    projectId ? { projectId } : "skip"
  );
  const checkpoints = useQuery(
    api.checkpoints.listByProject,
    projectId ? { projectId } : "skip"
  );

  const createProjectMut = useMutation(api.projects.create);
  const createMessageMut = useMutation(api.messages.create);
  const updateMessageMut = useMutation(api.messages.update);
  const createTurnMut = useMutation(api.turns.create);
  const updateTurnMut = useMutation(api.turns.update);
  const createCheckpointMut = useMutation(api.checkpoints.create);

  useEffect(() => {
    if (!projects) return;
    const mapped = projects.map((p) => ({
      id: p._id,
      _id: p._id,
      name: p.name,
      description: p.description,
      workspacePath: p.workspacePath,
      framework: p.framework,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
    useProjectStore.getState().setProjects(mapped as any);
  }, [projects]);

  useEffect(() => {
    if (!projectId || !messages) return;
    if (hydratedProjectRef.current === projectId) return;

    const currentMessages = useChatStore.getState().messages;
    if (currentMessages.length > 0) return;

    const mapped = messages.map((m) => ({
      id: m._id,
      role: m.role,
      content: m.content,
      turnId: m.turnId,
      isStreaming: false,
      model: m.model,
      tokenUsage:
        m.promptTokens != null && m.completionTokens != null
          ? { prompt: m.promptTokens, completion: m.completionTokens }
          : undefined,
      createdAt: m.createdAt,
    }));
    for (const m of mapped) {
      useChatStore.getState().addMessage(m as any);
    }
    hydratedProjectRef.current = projectId;
  }, [projectId, messages]);

  useEffect(() => {
    if (!projectId || !turns) return;
    const mapped = turns.map((t) => ({
      id: t._id,
      projectId: t.projectId as string,
      userMessage: t.userMessage,
      status: t.status,
      filesChanged: t.filesChanged,
      diffSummary: t.diffSummary,
      errorMessage: t.errorMessage,
      retryCount: t.retryCount ?? 0,
      model: t.model,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    }));
    useProjectStore.getState().setTurns(mapped as any);
  }, [projectId, turns]);

  useEffect(() => {
    if (!projectId || !checkpoints) return;
    const mapped = checkpoints.map((c) => ({
      id: c._id,
      projectId: c.projectId as string,
      turnId: c.turnId,
      ref: c.ref,
      commitHash: c.commitHash,
      turnCount: c.turnCount,
      label: c.label,
      createdAt: c.createdAt,
    }));
    useCheckpointStore.getState().setCheckpoints(mapped as any);
  }, [projectId, checkpoints]);

  const persistProject = useCallback(
    async (data: { name: string; workspacePath: string; description?: string; framework?: string }) => {
      try {
        return await createProjectMut(data);
      } catch {
        return null;
      }
    },
    [createProjectMut]
  );

  const persistMessage = useCallback(
    async (data: {
      projectId: string;
      role: "user" | "assistant" | "system";
      content: string;
      turnId?: string;
      isStreaming: boolean;
      model?: string;
      promptTokens?: number;
      completionTokens?: number;
    }) => {
      try {
        return await createMessageMut({
          ...data,
          projectId: data.projectId as Id<"projects">,
        });
      } catch {
        return null;
      }
    },
    [createMessageMut]
  );

  const updateMessage = useCallback(
    async (id: string, data: { content?: string; isStreaming?: boolean }) => {
      try {
        await updateMessageMut({ id: id as Id<"messages">, ...data });
      } catch {}
    },
    [updateMessageMut]
  );

  const persistTurn = useCallback(
    async (data: {
      projectId: string;
      userMessage: string;
      status: "planning" | "executing" | "completed" | "failed" | "repaired";
      model?: string;
    }) => {
      try {
        return await createTurnMut({
          ...data,
          projectId: data.projectId as Id<"projects">,
        });
      } catch {
        return null;
      }
    },
    [createTurnMut]
  );

  const updateTurn = useCallback(
    async (
      id: string,
      data: {
        status?: "planning" | "executing" | "completed" | "failed" | "repaired";
        filesChanged?: Array<{ path: string; action: "created" | "modified" | "deleted"; additions: number; deletions: number }>;
        errorMessage?: string;
        model?: string;
        promptTokens?: number;
        completionTokens?: number;
        checkpointRef?: string;
        completedAt?: number;
      }
    ) => {
      try {
        await updateTurnMut({ id: id as Id<"turns">, ...data });
      } catch {}
    },
    [updateTurnMut]
  );

  const persistCheckpoint = useCallback(
    async (data: {
      projectId: string;
      turnId?: string;
      ref?: string;
      commitHash?: string;
      turnCount: number;
      label?: string;
    }) => {
      try {
        return await createCheckpointMut({
          ...data,
          projectId: data.projectId as Id<"projects">,
          turnId: data.turnId as Id<"turns"> | undefined,
        });
      } catch {
        return null;
      }
    },
    [createCheckpointMut]
  );

  return {
    persistProject,
    persistMessage,
    updateMessage,
    persistTurn,
    updateTurn,
    persistCheckpoint,
  };
}
