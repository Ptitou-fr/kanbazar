// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { createCardAction } = vi.hoisted(() => ({ createCardAction: vi.fn() }));
vi.mock("@/app/actions/create-card", () => ({ createCardAction }));

import { CreateCardForm } from "@/components/board/create-card-form";

function typeTitle(value: string) {
  fireEvent.change(screen.getByLabelText("Titre de la nouvelle carte"), { target: { value } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
}

beforeEach(() => createCardAction.mockReset());
afterEach(cleanup);

describe("CreateCardForm", () => {
  // Critère 2 : un titre valide est envoyé à l'action, puis le champ se vide
  test("envoie le titre saisi et vide le champ une fois la carte enregistrée", async () => {
    createCardAction.mockResolvedValue({ ok: true });
    render(<CreateCardForm />);

    typeTitle("Brancher Turso");
    submit();

    await vi.waitFor(() => expect(createCardAction).toHaveBeenCalledOnce());
    const sent = createCardAction.mock.calls[0][0] as FormData;
    expect(sent.get("title")).toBe("Brancher Turso");
    await vi.waitFor(() =>
      expect((screen.getByLabelText("Titre de la nouvelle carte") as HTMLInputElement).value).toBe(""),
    );
  });

  // Critère 3 : titre vide refusé côté interface
  test.each([[""], ["   "]])("refuse le titre %j sans appeler l'action", async (title) => {
    render(<CreateCardForm />);

    typeTitle(title);
    submit();

    expect(await screen.findByText("Le titre est obligatoire.")).toBeDefined();
    expect(createCardAction).not.toHaveBeenCalled();
  });

  // Critère 5 : échec d'enregistrement signalé, rien n'est présenté comme enregistré
  test("signale l'échec d'enregistrement et garde le titre saisi", async () => {
    createCardAction.mockResolvedValue({ ok: false, error: "save_failed" });
    render(<CreateCardForm />);

    typeTitle("Brancher Turso");
    submit();

    expect((await screen.findByRole("alert")).textContent).toContain("Échec de l’enregistrement");
    expect((screen.getByLabelText("Titre de la nouvelle carte") as HTMLInputElement).value).toBe("Brancher Turso");
  });
});
