import "server-only";

import { exampleStore, type ExampleStore } from "@/data/example-store";

export function createExampleService(store: ExampleStore) {
  return {
    status: () => store.ping(),
  };
}

export const exampleService = createExampleService(exampleStore);
