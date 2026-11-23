import { expect, test } from "vitest";
import { exampleStore } from "@/data/example-store";

test("exampleStore.ping résout « ok »", async () => {
  await expect(exampleStore.ping()).resolves.toBe("ok");
});
