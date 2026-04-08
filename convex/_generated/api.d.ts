/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as checkpoints from "../checkpoints.js";
import type * as messages from "../messages.js";
import type * as projects from "../projects.js";
import type * as turns from "../turns.js";
import type * as users from "../users.js";

declare const fullApi: ApiFromModules<{
  checkpoints: typeof checkpoints;
  messages: typeof messages;
  projects: typeof projects;
  turns: typeof turns;
  users: typeof users;
}>;
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
