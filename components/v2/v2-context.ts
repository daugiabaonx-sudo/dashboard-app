// components/v2/v2-context.ts
// Shared runtime context of the V2 template engine (see v2-engine.ts).

import type { DecisionRequest, DecisionType } from "@/lib/types";
import type { V2DecisionMember, V2DecisionTab } from "@/lib/v2/v2-decisions";
import type { V2Model, V2Project, V2Status, V2Task, V2Blocker } from "@/lib/v2/v2-model";
import type { V2Helpers, V2SortState } from "./v2-core";

export type V2View = "overview" | "tasks" | "settings";
export type V2ToastType = "success" | "warning" | "error" | "info";

export interface V2Profile {
  readonly userId?: string;
  readonly name: string;
  readonly initials: string;
  readonly roleLabel: string;
}

export type V2SaveResult =
  | { readonly ok: true; readonly status: V2Status; readonly progress: number }
  | { readonly ok: false; readonly message: string };

export interface V2RaiseInput {
  readonly plannerTaskId: string;
  readonly taskTitle: string;
  readonly projectName: string;
  readonly type: DecisionType;
  readonly need: string;
  readonly unblockerId: string;
  readonly neededBy: string | null;
}

export type V2RaiseResult =
  | { readonly ok: true; readonly request: DecisionRequest; readonly plannerSynced: boolean }
  | { readonly ok: false; readonly message: string };

export interface V2ResolveInput {
  readonly action: "resolve" | "cancel";
  readonly resolution: string;
}

export type V2ResolveResult =
  | { readonly ok: true; readonly request: DecisionRequest; readonly plannerSynced: boolean }
  | { readonly ok: false; readonly message: string };

export interface V2Hooks {
  /** Persist a status/progress change for a Planner task. */
  saveTask(pid: string, change: { status: V2Status; progress: number }): Promise<V2SaveResult>;
  /** Create a human-raised Blocker & Decision request ("Giơ tay"). */
  raiseBlocker?(input: V2RaiseInput): Promise<V2RaiseResult>;
  /** Resolve or cancel an open Blocker & Decision request ("Khép vòng"). */
  resolveDecision?(id: string, input: V2ResolveInput): Promise<V2ResolveResult>;
  signOut(): Promise<void>;
  /** Reflect the active tab in the URL (no server round-trip). */
  navigate(view: V2View): void;
}

export interface V2State {
  q: string;
  period: string;
  team: string;
  project: string;
  view: V2View;
  tSort: V2SortState;
  cols: Record<"owner" | "deadline" | "risk" | "status", boolean>;
  pSort: V2SortState;
  pPage: number;
  pSize: number;
  bSort: V2SortState;
  bTab: V2DecisionTab | null;
  openBk: Set<string>;
  modalId: string | null;
  resolvingId: string | null;
  saving: boolean;
}

export interface V2Ctx {
  readonly root: HTMLElement;
  /** Element lookup by id (template ids are unique on the page). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- template DOM is untyped (inputs, selects, divs)
  $(id: string): any;
  /** addEventListener that is undone on unmount. */
  on(target: EventTarget, type: string, fn: (e: never) => void, opts?: AddEventListenerOptions | boolean): void;
  /** setTimeout that is cancelled on unmount. */
  later(fn: () => void, ms: number): void;
  alive(): boolean;
  readonly model: V2Model;
  TASKS: V2Task[];
  DECISIONS: DecisionRequest[];
  readonly MEMBERS: readonly V2DecisionMember[];
  readonly PROJECTS: readonly V2Project[];
  readonly BLOCKERS: readonly V2Blocker[];
  readonly h: V2Helpers;
  now: Date;
  readonly S: V2State;
  readonly canEdit: boolean;
  readonly canRaise: boolean;
  readonly profile: V2Profile;
  readonly hooks: V2Hooks;
  readonly render: {
    all(): void;
    tasksPage(): void;
    blockers(): void;
    projects(): void;
    secUI(): void;
    nav(): void;
    showView(view: V2View): void;
  };
  /** Stagger + search highlight, run after each render (template effects). */
  after(): void;
  toast(msg: string, type?: V2ToastType): void;
  filtered(): V2Task[];
  openModal(id: string): void;
  openRaiseModal(pid?: string): void;
  /** Apply a saved Planner change to the in-memory task list. */
  setStatus(id: string, key: string): void;
}
