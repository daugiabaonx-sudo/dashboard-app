// tests/unit/_helpers/query-chain.ts
// Shared helper for mocking the Supabase fluent query chain in unit tests.
//
// The source files do e.g.
//     const { data, error } = await supabase.from("x").select().eq().limit();
// which means each link in the chain must return something `await`-able,
// and `await` resolves it via the `.then` protocol. A naive `vi.fn().mockReturnValue(chain)`
// works for the non-terminal links but breaks at the terminal link: `await chain`
// would see `.then` exists, call `chain.then(resolve, reject)`, but `vi.fn().mockResolvedValue(...)`
// returns a resolved Promise WITHOUT invoking the callback — so the awaiter hangs forever.
//
// This helper exposes `setResult(value)` per-test to swap the terminal
// resolved value while reusing the same fluent chain shape.

import { vi } from "vitest";

export interface QueryChain {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  /** Internal — replaces the value that `then` resolves to. */
  __setResult: (value: { data: unknown; error: { message: string } | null }) => void;
  /** Terminal: invokes its callback so the awaiter resolves. */
  then: ReturnType<typeof vi.fn>;
}

export function makeQueryChain(): QueryChain {
  let resolved: { data: unknown; error: { message: string } | null } = {
    data: [],
    error: null,
  };
  const chain = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    then: vi.fn((onFulfilled: (v: typeof resolved) => unknown) =>
      Promise.resolve(onFulfilled(resolved)),
    ),
    __setResult: (value: typeof resolved) => {
      resolved = value;
    },
  } as unknown as QueryChain;
  chain.select.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
}

/**
 * Build a stub for `createSupabaseServerClient()` that returns the given
 * query chain from `from(...)` and a vi.fn() for `rpc(...)`.
 */
export function stubSupabase(chain: QueryChain) {
  return {
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn(),
  };
}
