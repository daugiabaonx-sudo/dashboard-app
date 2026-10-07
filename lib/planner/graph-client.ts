// lib/planner/graph-client.ts
// Minimal Microsoft Graph v1.0 HTTP client: bearer auth, JSON, ETag
// handling (Planner writes require If-Match), 429/503 retry honouring
// Retry-After, and @odata.nextLink pagination.

import "server-only";
import { GraphError } from "./errors";
import { getGraphToken } from "./token";

export const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 10_000;
const MAX_PAGES = 20;

export interface GraphRequestOptions {
  readonly method?: "GET" | "POST" | "PATCH" | "DELETE";
  readonly body?: unknown;
  /** ETag of the resource — required by Planner for PATCH / DELETE. */
  readonly ifMatch?: string;
  /** Ask Graph to return the updated entity on PATCH (otherwise 204). */
  readonly returnRepresentation?: boolean;
}

export interface GraphResult<T> {
  readonly data: T;
  readonly etag: string | null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function retryDelayMs(res: Response, attempt: number): number {
  const seconds = Number(res.headers.get("retry-after"));
  const ms = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 2 ** attempt * 500;
  return Math.min(ms, MAX_RETRY_DELAY_MS);
}

async function toGraphError(res: Response): Promise<GraphError> {
  const body = (await res.json().catch(() => null)) as {
    error?: { code?: string; message?: string };
  } | null;
  return new GraphError(
    body?.error?.message ?? `Graph request failed with status ${res.status}`,
    res.status,
    body?.error?.code ?? "unknown",
  );
}

function buildHeaders(token: string, opts: GraphRequestOptions): Headers {
  const headers = new Headers({ authorization: `Bearer ${token}`, accept: "application/json" });
  if (opts.body !== undefined) headers.set("content-type", "application/json");
  if (opts.ifMatch) headers.set("if-match", opts.ifMatch);
  if (opts.returnRepresentation) headers.set("prefer", "return=representation");
  return headers;
}

function resolveUrl(pathOrUrl: string): string {
  const url = pathOrUrl.startsWith("https://") ? pathOrUrl : `${GRAPH_BASE}${pathOrUrl}`;
  // nextLink values come from the network — never follow them off-Graph.
  if (!url.startsWith(`${GRAPH_BASE}/`)) {
    throw new GraphError("Refusing to call a non-Graph URL", 0, "invalid_url");
  }
  return url;
}

export async function graphRequest<T>(
  pathOrUrl: string,
  opts: GraphRequestOptions = {},
): Promise<GraphResult<T>> {
  const url = resolveUrl(pathOrUrl);
  const headers = buildHeaders(await getGraphToken(), opts);
  const init: RequestInit = {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
  };

  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(url, init);
    if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES) {
      await sleep(retryDelayMs(res, attempt));
      continue;
    }
    if (!res.ok) throw await toGraphError(res);

    const headerEtag = res.headers.get("etag");
    if (res.status === 204) return { data: undefined as T, etag: headerEtag };
    const data = (await res.json()) as T & { "@odata.etag"?: string };
    return { data, etag: headerEtag ?? data?.["@odata.etag"] ?? null };
  }
}

/** GET a collection, following @odata.nextLink up to MAX_PAGES pages. */
export async function graphList<T>(path: string): Promise<T[]> {
  let items: readonly T[] = [];
  let next: string | undefined = path;
  for (let page = 0; next && page < MAX_PAGES; page += 1) {
    const { data }: GraphResult<{ value: T[]; "@odata.nextLink"?: string }> =
      await graphRequest(next);
    items = [...items, ...data.value];
    next = data["@odata.nextLink"];
  }
  return [...items];
}
