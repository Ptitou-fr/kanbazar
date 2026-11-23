// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ExampleStatus } from "@/components/example-status";

test("ExampleStatus affiche le statut reçu", () => {
  render(<ExampleStatus status="ok" />);

  expect(screen.getByText("Statut : ok")).toBeDefined();
});
