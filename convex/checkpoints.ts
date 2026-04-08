import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return ctx.db
      .query("checkpoints")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    turnId: v.optional(v.id("turns")),
    ref: v.optional(v.string()),
    commitHash: v.optional(v.string()),
    turnCount: v.number(),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("checkpoints", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
