// lib/supabase/mock.ts
// In-memory Supabase adapter for local dev without Docker.
// Implements the subset of the supabase-js API used by lib/db/* and lib/auth/*.
// Mirrors the schema in supabase/migrations/ + the seed in supabase/seed.sql.
//
// NOT for production. Real Supabase is required for RLS, realtime, and persistence.
//
// Safe to import from both server and client modules: the mock state lives in
// module-level Maps which only matter server-side (mutations go through the
// Route handlers) but are harmless on the client (the realtime subscription
// component reads mockClient as a no-op stub in MOCK mode).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  activities as seedActivities,
  notifications as seedNotifications,
  projects as seedProjects,
  tasks as seedTasks,
  users as seedUsers,
  getKpis as computeKpis,
  getTeamWorkload as computeWorkload,
} from "@/lib/data";

const WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";
const CURRENT_USER_ID = "00000000-0000-0000-0000-00000000000a"; // u1 owner

export const MOCK_DEFAULT_USER_ID = CURRENT_USER_ID;
export const MOCK_DEFAULT_USER = (() => {
  const u = seedUsers.find((x) => x.id === CURRENT_USER_ID) ?? seedUsers[0]!;
  return { email: u.email, name: u.name };
})();

const profiles = new Map(seedUsers.map((u) => [u.id, { ...u }]));
const projects = new Map(seedProjects.map((p) => [p.id, { ...p }]));
const tasks = new Map(seedTasks.map((t) => [t.id, { ...t }]));
const activities = seedActivities.map((a) => ({ ...a }));
const notifications = seedNotifications.map((n) => ({ ...n }));

// Lazy snake-case row caches. `from(table)` returns a MockFrom constructed
// against the cached row array; subsequent mutations on that MockFrom mutate
// the cache in place so the next `from(table)` call observes them.
let projectRows: ProjectRow[] | null = null;
let taskRows: TaskRow[] | null = null;
let notificationRows: NotificationRow[] | null = null;
let activityRows: ActivityRow[] | null = null;

function getProjectRows(): ProjectRow[] {
  if (!projectRows) projectRows = Array.from(projects.values()).map(toProjectRow);
  return projectRows;
}
function getTaskRows(): TaskRow[] {
  if (!taskRows) taskRows = Array.from(tasks.values()).map(toTaskRow);
  return taskRows;
}
function getNotificationRows(): NotificationRow[] {
  if (!notificationRows)
    notificationRows = notifications.map((n, i) => toNotificationRow(n, i));
  return notificationRows;
}
function getActivityRows(): ActivityRow[] {
  if (!activityRows)
    activityRows = activities.map((a, i) => toActivityRow(a, i));
  return activityRows;
}

let signedInUserId: string | null = CURRENT_USER_ID;

export function getSignedInUserId(): string | null {
  return signedInUserId;
}

export function setSignedInUserId(id: string | null): void {
  signedInUserId = id;
}

// Lightweight query DSL helpers — keeps the API close to supabase-js so the
// real client can swap in without touching callers.
type Filter = { column: string; op: "eq"; value: unknown };

interface QueryResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

class MockQuery<T extends Record<string, unknown>> {
  private filters: Filter[] = [];
  private limitN: number | null = null;
  private orderBy: { column: string; ascending: boolean } | null = null;

  constructor(private rows: T[]) {}

  select(_columns?: string): this {
    return this;
  }
  eq(column: string, value: unknown): this {
    this.filters.push({ column, op: "eq", value });
    return this;
  }
  order(column: string, opts: { ascending: boolean }): this {
    this.orderBy = { column, ascending: opts.ascending };
    return this;
  }
  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  private match(row: T): boolean {
    return this.filters.every((f) => row[f.column] === f.value);
  }

  private applyOrdering(input: T[]): T[] {
    if (!this.orderBy) return input;
    const { column, ascending } = this.orderBy;
    return [...input].sort((a, b) => {
      const av = a[column];
      const bv = b[column];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : 1;
      return ascending ? cmp : -cmp;
    });
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onFulfilled?:
      | ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const filtered = this.rows.filter((r) => this.match(r));
    const ordered = this.applyOrdering(filtered);
    const limited =
      this.limitN !== null ? ordered.slice(0, this.limitN) : ordered;
    const result: QueryResult<T> = { data: limited, error: null };
    return Promise.resolve(onFulfilled ? onFulfilled(result) : (result as unknown as TResult1))
      .catch(onRejected ?? undefined) as PromiseLike<TResult1 | TResult2>;
  }
}

interface ProfileRow extends Record<string, unknown> {
  id: string;
  email: string;
  full_name: string;
  initials: string;
  avatar_color: string;
  department: string;
  role: string;
  capacity_hours: number;
  joined_at: string;
}

function toProfileRow(u: (typeof seedUsers)[number]): ProfileRow {
  return {
    id: u.id,
    email: u.email,
    full_name: u.name,
    initials: u.initials,
    avatar_color: u.avatarColor,
    department: u.department,
    role: u.role,
    capacity_hours: u.capacityHours,
    joined_at: u.joinedAt,
  };
}

interface ProjectRow extends Record<string, unknown> {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  owner_id: string;
  member_ids: string[];
  start_date: string;
  due_date: string;
  progress: number;
  budget: number;
  spent: number;
  tags: string[];
}

function toProjectRow(p: (typeof seedProjects)[number]): ProjectRow {
  return {
    id: p.id,
    workspace_id: WORKSPACE_ID,
    name: p.name,
    description: p.description,
    status: p.status,
    priority: p.priority,
    owner_id: p.ownerId,
    member_ids: p.memberIds,
    start_date: p.startDate,
    due_date: p.dueDate,
    progress: p.progress,
    budget: p.budget,
    spent: p.spent,
    tags: p.tags,
  };
}

interface TaskRow extends Record<string, unknown> {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id: string;
  reporter_id: string;
  due_date: string;
  estimated_hours: number;
  logged_hours: number;
  progress: number;
  blocked: boolean;
  blocker_note: string | null;
  tags: string[];
  comments: number;
  attachments: number;
  created_at: string;
  updated_at: string;
}

function toTaskRow(t: (typeof seedTasks)[number]): TaskRow {
  return {
    id: t.id,
    workspace_id: WORKSPACE_ID,
    project_id: t.projectId,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assignee_id: t.assigneeId,
    reporter_id: t.reporterId,
    due_date: t.dueDate,
    estimated_hours: t.estimatedHours,
    logged_hours: t.loggedHours,
    progress: t.progress,
    blocked: t.blocked ?? false,
    blocker_note: t.blockerNote ?? null,
    tags: t.tags,
    comments: t.comments,
    attachments: t.attachments,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

interface NotificationRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  created_at: string;
}

function toNotificationRow(n: (typeof seedNotifications)[number], idx: number): NotificationRow {
  return {
    id: n.id,
    user_id: CURRENT_USER_ID,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.read,
    created_at: new Date(Date.now() - idx * 3600_000).toISOString(),
  };
}

interface ActivityRow extends Record<string, unknown> {
  id: string;
  workspace_id: string;
  actor_id: string;
  type: string;
  target_type: string;
  target_id: string;
  target_title: string;
  message: string;
  created_at: string;
}

function toActivityRow(a: (typeof activities)[number], idx: number): ActivityRow {
  return {
    id: a.id,
    workspace_id: WORKSPACE_ID,
    actor_id: a.actorId,
    type: a.type,
    target_type: a.targetType,
    target_id: a.targetId,
    target_title: a.targetTitle,
    message: a.message,
    created_at: new Date(Date.now() - idx * 1800_000).toISOString(),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Mock pub/sub — mirrors the slice of Supabase Realtime that the dashboard
// actually uses. `components/realtime/subscriptions.tsx` subscribes via
// `.channel(name).on("postgres_changes", { event, schema, table, filter }, fn)`
// and the invalidator closes over TanStack Query; here we record each
// subscription in `__mockSubscriptions` keyed by channel name and replay
// every table mutation through matching handlers as a Supabase-shaped
// `{ eventType, schema, table, new, old }` payload. Synchronous by design —
// `subscriptions.tsx` already wraps the consumer in a 150ms debounce so the
// downstream invalidation coalesces bursts of mutations.
// ───────────────────────────────────────────────────────────────────────────

type BroadcastEventType = "INSERT" | "UPDATE" | "DELETE";

interface PostgresChangesPayload {
  eventType: BroadcastEventType;
  schema: string;
  table: string;
  new: Record<string, unknown> | undefined;
  old: Record<string, unknown> | undefined;
}

interface MockSubscription {
  channelName: string;
  table: string;
  event: "*" | BroadcastEventType;
  filterColumn: string | null;
  filterValue: string | null;
  handler: (payload: PostgresChangesPayload) => void;
}

const __mockSubscriptions: MockSubscription[] = [];

function channelToTable(channelName: string): string | null {
  // subscriptions.tsx uses channelNames.tasks / activity / notifications, each
  // producing names like "tasks:ws_xxx" / "activity:ws_xxx" / "notifications:user_xxx".
  const prefix = channelName.split(":")[0];
  switch (prefix) {
    case "tasks":
      return "tasks";
    case "activity":
      return "activity_log";
    case "notifications":
      return "notifications";
    default:
      return null;
  }
}

function __broadcast(
  table: string,
  eventType: BroadcastEventType,
  newRow: Record<string, unknown> | undefined,
  oldRow: Record<string, unknown> | undefined,
): void {
  for (const sub of __mockSubscriptions) {
    if (sub.table !== table) continue;
    if (sub.event !== "*" && sub.event !== eventType) continue;
    if (sub.filterColumn !== null && sub.filterValue !== null) {
      const candidate =
        eventType === "DELETE" ? oldRow?.[sub.filterColumn] : newRow?.[sub.filterColumn];
      if (candidate !== sub.filterValue) continue;
    }
    sub.handler({
      eventType,
      schema: "public",
      table,
      new: newRow,
      old: oldRow,
    });
  }
}

interface MockChannelOptions {
  event: "*" | BroadcastEventType;
  schema: string;
  table: string;
  filter?: string;
}

function parseFilter(
  filter: string | undefined,
): { column: string | null; value: string | null } {
  if (!filter) return { column: null, value: null };
  // Supabase filter shape: "column=eq.value" or "column=eq.<value>" with
  // dot-separated value (we only need eq). We split on "=eq." and keep the
  // raw value (UUIDs, ints, etc.) as-is.
  const idx = filter.indexOf("=eq.");
  if (idx < 0) return { column: null, value: null };
  return { column: filter.slice(0, idx), value: filter.slice(idx + 4) };
}

class MockChannel {
  private pendingSub: MockSubscription | null = null;

  constructor(public readonly name: string) {}

  on(
    _type: "postgres_changes",
    options: MockChannelOptions,
    handler: (payload: PostgresChangesPayload) => void,
  ): this {
    const { column, value } = parseFilter(options.filter);
    const table = channelToTable(this.name) ?? options.table;
    this.pendingSub = {
      channelName: this.name,
      table,
      event: options.event,
      filterColumn: column,
      filterValue: value,
      handler,
    };
    return this;
  }

  subscribe(): this {
    if (this.pendingSub) {
      __mockSubscriptions.push(this.pendingSub);
      this.pendingSub = null;
    }
    return this;
  }

  unsubscribe(): void {
    for (let i = __mockSubscriptions.length - 1; i >= 0; i--) {
      if (__mockSubscriptions[i]!.channelName === this.name) {
        __mockSubscriptions.splice(i, 1);
      }
    }
  }
}

class MockFrom<T extends Record<string, unknown>> {
  constructor(private rows: T[], private table: string) {}

  select(_columns?: string): MockQuery<T> {
    return new MockQuery<T>(this.rows);
  }

  insert(values: Partial<T> | Partial<T>[]): { select: () => MockQuery<T> } {
    const arr = Array.isArray(values) ? values : [values];
    const inserted: T[] = [];
    for (const v of arr) {
      const id = (v as { id?: string }).id ?? crypto.randomUUID();
      const row = { ...(v as T), id } as T;
      this.rows.push(row);
      inserted.push(row);
    }
    for (const row of inserted) {
      __broadcast(this.table, "INSERT", row as Record<string, unknown>, undefined);
    }
    return {
      select: () => new MockQuery<T>(inserted),
    };
  }

  update(values: Partial<T>): {
    eq: (column: string, value: unknown) => {
      select: () => MockQuery<T>;
    };
  } {
    return {
      eq: (column: string, value: unknown) => {
        const matched = this.rows.filter((r) => r[column] === value);
        for (const r of matched) {
          const original = { ...r };
          Object.assign(r, values);
          __broadcast(
            this.table,
            "UPDATE",
            r as Record<string, unknown>,
            original as Record<string, unknown>,
          );
        }
        return { select: () => new MockQuery<T>(matched) };
      },
    };
  }

  delete(): {
    eq: (column: string, value: unknown) => Promise<{ error: null }>;
  } {
    return {
      eq: (column: string, value: unknown) => {
        const idx = this.rows.findIndex((r) => r[column] === value);
        if (idx >= 0) {
          const [removed] = this.rows.splice(idx, 1);
          __broadcast(
            this.table,
            "DELETE",
            undefined,
            removed as Record<string, unknown>,
          );
        }
        return Promise.resolve({ error: null });
      },
    };
  }
}

export const mockClient: SupabaseClient = {
  from(table: string): unknown {
    switch (table) {
      case "profiles":
        return new MockFrom(Array.from(profiles.values()).map(toProfileRow), table);
      case "projects":
        return new MockFrom(getProjectRows(), table);
      case "tasks":
        return new MockFrom(getTaskRows(), table);
      case "notifications":
        return new MockFrom(getNotificationRows(), table);
      case "activity_log":
        return new MockFrom(getActivityRows(), table);
      default:
        return new MockFrom([], table);
    }
  },
  rpc(_fn: string, _args?: Record<string, unknown>): Promise<{ data: unknown; error: null }> {
    if (_fn === "workspace_kpis") {
      return Promise.resolve({ data: computeKpis(), error: null });
    }
    if (_fn === "workspace_workload") {
      return Promise.resolve({ data: computeWorkload(), error: null });
    }
    return Promise.resolve({ data: null, error: null });
  },
  auth: {
    async getUser() {
      if (!signedInUserId) return { data: { user: null }, error: null };
      const u = seedUsers.find((x) => x.id === signedInUserId);
      if (!u) return { data: { user: null }, error: null };
      return {
        data: {
          user: {
            id: u.id,
            email: u.email,
            user_metadata: { full_name: u.name, initials: u.initials },
          },
        },
        error: null,
      };
    },
    async signInWithPassword(creds: { email: string; password: string }) {
      const u = seedUsers.find((x) => x.email === creds.email);
      if (!u) return { data: { user: null, session: null }, error: { message: "Invalid credentials" } };
      signedInUserId = u.id;
      return { data: { user: { id: u.id, email: u.email }, session: { access_token: "mock-token" } }, error: null };
    },
    async signUp(creds: { email: string; password: string; options?: { data?: Record<string, string> } }) {
      const id = crypto.randomUUID();
      const meta = creds.options?.data ?? {};
      const newUser = {
        id,
        email: creds.email,
        name: meta.full_name ?? creds.email.split("@")[0]!,
        role: "member" as const,
        avatarColor: "#6366f1",
        initials: meta.initials ?? creds.email.slice(0, 2).toUpperCase(),
        department: "General",
        joinedAt: new Date().toISOString().slice(0, 10),
        capacityHours: 40,
      };
      seedUsers.push(newUser);
      profiles.set(id, { ...newUser });
      signedInUserId = id;
      return { data: { user: { id, email: creds.email }, session: null }, error: null };
    },
    async signOut() {
      signedInUserId = null;
      return { error: null };
    },
  },
  channel(name: string): MockChannel {
    return new MockChannel(name);
  },
  removeChannel(ch: unknown) {
    if (ch instanceof MockChannel) ch.unsubscribe();
    return Promise.resolve("ok");
  },
} as unknown as SupabaseClient;
