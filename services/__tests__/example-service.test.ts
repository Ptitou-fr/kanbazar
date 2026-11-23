import { expect, test } from "vitest";
import type { ExampleStore } from "@/data/example-store";
import { createExampleService } from "@/services/example-service";

test("status délègue à la couche données", async () => {
  const fakeStore: ExampleStore = { ping: async () => "ok" };

  await expect(createExampleService(fakeStore).status()).resolves.toBe("ok");
});
