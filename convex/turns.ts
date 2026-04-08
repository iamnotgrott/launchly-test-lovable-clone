import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const fileChangeValidator = v.object({
  path: v.string(),
  action: v.union(v.literal("created"), v.literal("modified"), v.literal("deleted")),
  additions: v.number(),
  deletions: v.number(),
});

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return ctx.db
      .query("turns")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    userMessage: v.string(),
    status: v.union(
      v.literal("planning"),
      v.literal("executing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("repaired")
    ),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("turns", {
      ...args,
      filesChanged: [],
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("turns"),
    status: v.optional(
      v.union(
        v.literal("planning"),
        v.literal("executing"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("repaired")
      )
    ),
    filesChanged: v.optional(v.array(fileChangeValidator)),
    diffSummary: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    retryCount: v.optional(v.number()),
    model: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    checkpointRef: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const updates: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) updates[k] = val;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(id, updates);
    }
  },
});
