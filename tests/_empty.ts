// tests/_empty.ts
// Empty module used to alias `server-only` in vitest config so that
// `import "server-only"` lines (which exist purely as a runtime guard
// against accidental client imports) resolve without throwing.
export {};
