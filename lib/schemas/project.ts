// lib/schemas/project.ts
// Project create/update schemas — mirror supabase.projects columns.

import { z } from "zod";
import {
  isoDateSchema,
  projectPrioritySchema,
  projectStatusSchema,
} from "./common";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).default(""),
  status: projectStatusSchema.default("planning"),
  priority: projectPrioritySchema.default("medium"),
  ownerId: z.string().uuid(),
  memberIds: z.array(z.string().uuid()).default([]),
  startDate: isoDateSchema,
  dueDate: isoDateSchema,
  budget: z.number().int().min(0).default(0),
  tags: z.array(z.string().min(1).max(40)).default([]),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
