import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

it("retires the legacy worker and only removes its own caches before refreshing controlled pages", async () => {
  const handlers: Record<
    string,
    (event: { waitUntil: (promise: Promise<unknown>) => void }) => void
  > = {};
  const navigate = vi.fn().mockResolvedValue(undefined);
  const unregister = vi.fn().mockResolvedValue(true);
  const skipWaiting = vi.fn();
  const deleteCache = vi.fn().mockResolvedValue(true);
  const matchAll = vi
    .fn()
    .mockResolvedValue([{ url: "https://example.test/", navigate }]);
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: {
      addEventListener: (name: string, handler: (typeof handlers)[string]) => {
        handlers[name] = handler;
      },
      skipWaiting,
      registration: { unregister },
      clients: { matchAll },
    },
    caches: {
      keys: async () => [
        "habit-tracker-shell-v1",
        "habit-tracker-shell-v2",
        "another-app-cache",
      ],
      delete: deleteCache,
    },
  });
  handlers.install({ waitUntil: vi.fn() });
  expect(skipWaiting).toHaveBeenCalledOnce();
  let migration: Promise<unknown> | undefined;
  handlers.activate({
    waitUntil: (promise) => {
      migration = promise;
    },
  });
  await migration;
  expect(deleteCache.mock.calls).toEqual([
    ["habit-tracker-shell-v1"],
    ["habit-tracker-shell-v2"],
  ]);
  expect(unregister).toHaveBeenCalledOnce();
  expect(matchAll).toHaveBeenCalledWith({ type: "window" });
  expect(navigate).toHaveBeenCalledWith("https://example.test/");
  expect(Object.keys(handlers).sort()).toEqual(["activate", "install"]);
});
