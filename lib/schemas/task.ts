// lib/schemas/task.ts
// Task create/update schemas — mirror supabase.tasks columns.

import { z } from "zod";
import {
  isoDateSchema,
  taskPrioritySchema,
  taskStatusSchema,
} from "./common";

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().nullable().optional(),
  reporterId: z.string().uuid(),
  status: taskStatusSchema.default("backlog"),
  priority: taskPrioritySchema.default("medium"),
  dueDate: isoDateSchema,
  estimatedHours: z.number().int().min(0).max(1000).default(0),
  tags: z.array(z.string().min(1).max(40)).default([]),
  blocked: z.boolean().default(false),
  blockerNote: z.string().max(500).nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial();
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const taskStatusUpdateSchema = z.object({
  status: taskStatusSchema,
});
export type TaskStatusUpdate = z.infer<typeof taskStatusUpdateSchema>;
