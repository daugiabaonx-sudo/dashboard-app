// lib/planner/errors.ts
// Typed errors for the Microsoft Planner (Graph) integration. Route
// handlers map these onto HTTP responses in `route-errors.ts`.

/** Missing / malformed MS_* environment variables. */
export class PlannerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlannerConfigError";
  }
}

/** Caller supplied an invalid id or payload (never reaches Graph). */
export class PlannerInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlannerInputError";
  }
}

/** Microsoft Entra refused to issue an app-only access token. */
export class TokenError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "TokenError";
    this.code = code;
  }
}

/** Microsoft Graph returned a non-2xx response. */
export class GraphError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "GraphError";
    this.status = status;
    this.code = code;
  }
}
