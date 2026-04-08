import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  projects: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    description: v.optional(v.string()),
    workspacePath: v.string(),
    framework: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    projectId: v.id("projects"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    turnId: v.optional(v.string()),
    isStreaming: v.boolean(),
    model: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  turns: defineTable({
    projectId: v.id("projects"),
    userMessage: v.string(),
    status: v.union(
      v.literal("planning"),
      v.literal("executing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("repaired")
    ),
    filesChanged: v.array(
      v.object({
        path: v.string(),
        action: v.union(v.literal("created"), v.literal("modified"), v.literal("deleted")),
        additions: v.number(),
        deletions: v.number(),
      })
    ),
    diffSummary: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    retryCount: v.optional(v.number()),
    model: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    checkpointRef: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_project", ["projectId"]),

  checkpoints: defineTable({
    projectId: v.id("projects"),
    turnId: v.optional(v.id("turns")),
    ref: v.optional(v.string()),
    commitHash: v.optional(v.string()),
    turnCount: v.number(),
    label: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),
});