import "server-only";

export type ExampleStore = {
  ping(): Promise<"ok">;
};

export const exampleStore: ExampleStore = {
  async ping() {
    return "ok";
  },
};
