// lib/schemas/decision-request.ts
// Validation schemas for human-raised Blocker & Decision requests.

import { z } from "zod";
import { isoDateSchema } from "./common";

export const decisionTypeSchema = z.enum([
  "decision",
  "waiting_on",
  "missing_info",
  "missing_resource",
  "technical",
]);

const USER_ID_RE =
  /^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|u\d+)$/;

export const createDecisionRequestSchema = z.object({
  plannerTaskId: z.string().trim().min(1).max(128),
  taskTitle: z.string().trim().min(1).max(200),
  projectName: z.string().trim().max(200).optional().default(""),
  type: decisionTypeSchema,
  need: z.string().trim().min(1, "Vui lòng nhập nội dung cần hỗ trợ").max(500),
  unblockerId: z.string().trim().regex(USER_ID_RE, "Người gỡ vướng không hợp lệ"),
  neededBy: isoDateSchema.nullable().optional().default(null),
});

export type CreateDecisionRequestInput = z.infer<typeof createDecisionRequestSchema>;

export const resolveDecisionRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("resolve"),
    resolution: z.string().trim().max(500).optional().default(""),
  }),
  z.object({
    action: z.literal("cancel"),
    resolution: z.string().trim().max(500).optional().default(""),
  }),
]);

export type ResolveDecisionRequestInput = z.infer<typeof resolveDecisionRequestSchema>;
