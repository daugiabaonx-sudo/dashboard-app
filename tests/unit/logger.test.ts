import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { error, info, warn } from "@/lib/logger";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serialises info as JSON to stdout", () => {
    info("server started", { port: 3000 });
    expect(console.log).toHaveBeenCalledTimes(1);
    const [line] = (console.log as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    const parsed = JSON.parse(line);
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("server started");
    expect(parsed.port).toBe(3000);
    expect(parsed.timestamp).toMatch(/T/);
  });

  it("routes warn to console.warn", () => {
    warn("deprecation", { feature: "v1" });
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.log).not.toHaveBeenCalled();
  });

  it("routes error to console.error", () => {
    error("rpc failed", { route: "/api/projects" });
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.log).not.toHaveBeenCalled();
  });

  it("omits fields when none are passed", () => {
    info("ping");
    const [line] = (console.log as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    const parsed = JSON.parse(line);
    expect(parsed.msg).toBe("ping");
    expect(parsed.timestamp).toBeDefined();
  });
});
