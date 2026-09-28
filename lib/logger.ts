/**
 * Tiny structured logger. Production rules: Node-only routes use `info+`;
 * the browser never calls this directly (React Query + sonner handle UI).
 *
 * Why not pino/winston: we have two call sites right now and adding a dep
 * for two call sites is the wrong move (see YAGNI). If/when log volume
 * grows, swap by changing only this file — every consumer imports the
 * named exports `info`, `warn`, `error`.
 */

type Level = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function emit(level: Level, msg: string, fields?: LogFields): void {
  const timestamp = new Date().toISOString();
  const line = { timestamp, level, msg, ...(fields ?? {}) };
  const serialized = JSON.stringify(line);
  if (level === "error") {
    console.error(serialized);
    return;
  }
  if (level === "warn") {
    console.warn(serialized);
    return;
  }
  console.log(serialized);
}

export function info(msg: string, fields?: LogFields): void {
  emit("info", msg, fields);
}

export function warn(msg: string, fields?: LogFields): void {
  emit("warn", msg, fields);
}

export function error(msg: string, fields?: LogFields): void {
  emit("error", msg, fields);
}
