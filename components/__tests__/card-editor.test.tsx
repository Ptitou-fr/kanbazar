// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { updateCardAction, toastError } = vi.hoisted(() => ({ updateCardAction: vi.fn(), toastError: vi.fn() }));
vi.mock("@/app/actions/update-card", () => ({ updateCardAction }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import { CardEditor } from "@/components/board/card-editor";
import type { Card } from "@/services/card-service";

const card: Card = { id: "a", title: "Brancher Turso", description: "", status: "todo", position: 1 };

function renderEditor(value: Card = card) {
  const onClose = vi.fn();
  render(<CardEditor card={value} onClose={onClose} />);
  const dialog = screen.getByRole("dialog", { name: "Modifier la carte" });
  return { dialog, onClose };
}

function edit(label: string, value: string) {
  const field = screen.getByLabelText(label);
  fireEvent.change(field, { target: { value } });
  fireEvent.blur(field);
}

beforeEach(() => {
  updateCardAction.mockReset();
  toastError.mockReset();
});
afterEach(cleanup);

describe("CardEditor", () => {
  test("ouvre le panneau avec le titre et la description de la carte, sans bouton « Enregistrer »", () => {
    const { dialog } = renderEditor({ ...card, description: "Créer le client" });

    expect((screen.getByLabelText("Titre") as HTMLInputElement).value).toBe("Brancher Turso");
    expect((screen.getByLabelText("Description") as HTMLTextAreaElement).value).toBe("Créer le client");
    expect(within(dialog).getByText("Les modifications s’enregistrent automatiquement.")).toBeDefined();
    expect(within(dialog).queryByRole("button", { name: /enregistrer/i })).toBeNull();
  });

  // Lot 2, critère 1 : le titre s'enregistre quand on quitte le champ
  test("enregistre le nouveau titre quand on quitte le champ", async () => {
    updateCardAction.mockResolvedValue({ ok: true, card: { ...card, title: "Nouveau titre" } });
    const { dialog } = renderEditor();

    edit("Titre", "Nouveau titre");

    await vi.waitFor(() => expect(updateCardAction).toHaveBeenCalledWith("a", { title: "Nouveau titre" }));
    await vi.waitFor(() => expect(within(dialog).getByRole("status").textContent).toContain("Enregistré"));
  });

  test("n'enregistre rien quand le titre n'a pas changé", () => {
    renderEditor();

    edit("Titre", "Brancher Turso");

    expect(updateCardAction).not.toHaveBeenCalled();
  });

  // Lot 2, critère 2 : description ajoutée puis effacée
  test("enregistre la description ajoutée, puis effacée, sans action distincte", async () => {
    updateCardAction.mockImplementation(async (_id: string, patch: Partial<Card>) => ({ ok: true, card: { ...card, ...patch } }));
    renderEditor();

    edit("Description", "Créer le client dans data/");
    await vi.waitFor(() => expect(updateCardAction).toHaveBeenCalledWith("a", { description: "Créer le client dans data/" }));

    edit("Description", "");
    await vi.waitFor(() => expect(updateCardAction).toHaveBeenLastCalledWith("a", { description: "" }));
  });

  test("enregistre la description en cours de frappe, sans attendre la sortie du champ", async () => {
    updateCardAction.mockResolvedValue({ ok: true, card: { ...card, description: "En cours" } });
    renderEditor();

    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "En cours" } });

    await vi.waitFor(() => expect(updateCardAction).toHaveBeenCalledWith("a", { description: "En cours" }), { timeout: 2000 });
  });

  // Lot 2, critère 3 : titre vidé refusé côté interface
  test.each([[""], ["   "]])("refuse le titre %j avec un message, sans rien envoyer", async (title) => {
    renderEditor();

    edit("Titre", title);

    expect(await screen.findByText("Le titre est obligatoire.")).toBeDefined();
    expect(screen.getByLabelText("Titre").getAttribute("aria-invalid")).toBe("true");
    expect(updateCardAction).not.toHaveBeenCalled();
  });

  // Lot 2, critère 4 : échec signalé, la modification n'est pas présentée comme enregistrée
  test("signale l'échec d'enregistrement dans le panneau et par une notification", async () => {
    updateCardAction.mockResolvedValue({ ok: false, error: "save_failed" });
    const { dialog } = renderEditor();

    edit("Titre", "Nouveau titre");

    await vi.waitFor(() => expect(within(dialog).getByRole("status").textContent).toContain("Échec de l’enregistrement"));
    expect(within(dialog).getByRole("status").textContent).not.toContain("Enregistré");
    expect(toastError).toHaveBeenCalledWith("Échec de l’enregistrement", expect.objectContaining({
      description: "« Brancher Turso » n’a pas été modifiée.",
    }));
  });

  test("enregistre le titre modifié à la fermeture du panneau", async () => {
    updateCardAction.mockResolvedValue({ ok: true, card: { ...card, title: "Fermé" } });
    const { dialog, onClose } = renderEditor();

    fireEvent.change(screen.getByLabelText("Titre"), { target: { value: "Fermé" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Fermer" }));

    await vi.waitFor(() => expect(updateCardAction).toHaveBeenCalledWith("a", { title: "Fermé" }));
    expect(onClose).toHaveBeenCalled();
  });
});
