// lib/planner/types.ts
// Subset of the Microsoft Graph Planner resource shapes we consume, plus
// zod schemas for the inputs we send.
// Ref: https://learn.microsoft.com/en-us/graph/api/resources/plannertask

import { z } from "zod";

export interface PlannerIdentitySet {
  readonly user?: { readonly id?: string; readonly displayName?: string | null };
}

export interface PlannerPlan {
  readonly id: string;
  readonly title: string;
  readonly owner?: string;
  readonly createdDateTime?: string;
  readonly container?: { readonly containerId?: string; readonly type?: string };
  readonly "@odata.etag"?: string;
}

/** Minimal Microsoft 365 group shape (from `$select=id,displayName`). */
export interface PlannerGroup {
  readonly id: string;
  readonly displayName: string;
}

/** A plan plus the group that owns it — returned by the "all plans" listing. */
export interface PlannerPlanWithGroup extends PlannerPlan {
  readonly groupId: string;
  readonly groupName: string;
}

/**
 * A user in a Microsoft 365 group. Names come back as null unless the app
 * also has User.Read.All (Group.Read.All alone only reveals ids).
 */
export interface PlannerMember {
  readonly id: string;
  readonly displayName: string | null;
  readonly jobTitle?: string | null;
  readonly department?: string | null;
}

export interface PlannerBucket {
  readonly id: string;
  readonly name: string;
  readonly planId: string;
  readonly orderHint: string;
  readonly "@odata.etag"?: string;
}

export interface PlannerAssignment {
  readonly "@odata.type"?: string;
  readonly assignedDateTime?: string;
  readonly orderHint?: string;
  readonly assignedBy?: PlannerIdentitySet;
}

export interface PlannerTask {
  readonly id: string;
  readonly planId: string;
  readonly bucketId: string | null;
  readonly title: string;
  /** 0 = not started, 50 = in progress, 100 = completed. */
  readonly percentComplete: number;
  /** 0–10; Planner UI uses 1 urgent, 3 important, 5 medium, 9 low. */
  readonly priority: number;
  readonly startDateTime: string | null;
  readonly dueDateTime: string | null;
  readonly createdDateTime: string;
  readonly completedDateTime: string | null;
  readonly assignments: Readonly<Record<string, PlannerAssignment>>;
  readonly checklistItemCount?: number;
  readonly activeChecklistItemCount?: number;
  readonly "@odata.etag"?: string;
}

const plannerId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, "Invalid Planner id");
const isoDate = z.iso.datetime({ offset: true });
/** Planner UI: 0 not started, 1–99 in progress, 100 completed. */
const percent = z.number().int().min(0).max(100);

export const newTaskSchema = z.object({
  planId: plannerId,
  title: z.string().trim().min(1).max(255),
  bucketId: plannerId.optional(),
  dueDateTime: isoDate.optional(),
  percentComplete: percent.optional(),
  priority: z.number().int().min(0).max(10).optional(),
  assigneeIds: z.array(z.guid()).max(20).optional(),
});
export type NewPlannerTask = z.infer<typeof newTaskSchema>;

export const taskPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    bucketId: plannerId.optional(),
    dueDateTime: isoDate.nullable().optional(),
    percentComplete: percent.optional(),
    priority: z.number().int().min(0).max(10).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Patch must change at least one field");
export type PlannerTaskPatch = z.infer<typeof taskPatchSchema>;
