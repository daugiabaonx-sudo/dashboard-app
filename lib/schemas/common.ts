// lib/schemas/common.ts
// Shared enum schemas — mirror Postgres text + CHECK constraints.

import { z } from "zod";

export const projectStatusSchema = z.enum(["planning", "active", "on_hold", "completed"]);
export const projectPrioritySchema = z.enum(["low", "medium", "high", "critical"]);

export const taskStatusSchema = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
]);
export const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const userRoleSchema = z.enum(["owner", "admin", "manager", "member", "viewer"]);

export const notificationTypeSchema = z.enum([
  "deadline",
  "mention",
  "assigned",
  "completed",
  "blocked",
]);

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
