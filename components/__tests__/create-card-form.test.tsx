// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { createCardAction } = vi.hoisted(() => ({ createCardAction: vi.fn() }));
vi.mock("@/app/actions/create-card", () => ({ createCardAction }));

import { OPEN_NEW_CARD_EVENT } from "@/components/board/columns";
import { CreateCardForm } from "@/components/board/create-card-form";

function titleField() {
  return screen.getByLabelText("Titre de la nouvelle carte") as HTMLInputElement;
}

function descriptionField() {
  return screen.getByLabelText("Description de la nouvelle carte") as HTMLTextAreaElement;
}

function open() {
  fireEvent.click(screen.getByRole("button", { name: "Ajouter une carte" }));
}

function fill(title: string, description?: string) {
  fireEvent.change(titleField(), { target: { value: title } });
  if (description !== undefined) fireEvent.change(descriptionField(), { target: { value: description } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
}

beforeEach(() => createCardAction.mockReset());
afterEach(cleanup);

describe("CreateCardForm", () => {
  // Issue #17 : formulaire replié derrière « Ajouter une carte », comme dans le canevas
  test("est replié derrière « Ajouter une carte » et s'ouvre sur le titre", () => {
    render(<CreateCardForm />);

    expect(screen.queryByLabelText("Titre de la nouvelle carte")).toBeNull();
    open();

    expect(document.activeElement).toBe(titleField());
    expect(descriptionField()).toBeDefined();
  });

  test("« Nouvelle carte » (barre latérale) ouvre le formulaire", () => {
    render(<CreateCardForm />);

    act(() => {
      window.dispatchEvent(new Event(OPEN_NEW_CARD_EVENT));
    });

    expect(document.activeElement).toBe(titleField());
  });

  // Lot 1, critère 2 et issue #17 : titre et description envoyés, formulaire prêt pour la suivante
  test("envoie le titre et la description, puis vide les champs en restant ouvert", async () => {
    createCardAction.mockResolvedValue({ ok: true });
    render(<CreateCardForm />);
    open();

    fill("Brancher Turso", "Créer le client dans data/");
    submit();

    await vi.waitFor(() => expect(createCardAction).toHaveBeenCalledOnce());
    const sent = createCardAction.mock.calls[0][0] as FormData;
    expect(sent.get("title")).toBe("Brancher Turso");
    expect(sent.get("description")).toBe("Créer le client dans data/");
    await vi.waitFor(() => expect(titleField().value).toBe(""));
    expect(descriptionField().value).toBe("");
  });

  test("« Annuler » referme le formulaire et oublie la saisie", () => {
    render(<CreateCardForm />);
    open();
    fill("Brouillon", "À oublier");

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByLabelText("Titre de la nouvelle carte")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Ajouter une carte" }));
    open();
    expect(titleField().value).toBe("");
  });

  test("Échap referme le formulaire", () => {
    render(<CreateCardForm />);
    open();

    fireEvent.keyDown(titleField(), { key: "Escape" });

    expect(screen.queryByLabelText("Titre de la nouvelle carte")).toBeNull();
  });

  // Lot 1, critère 3 : titre vide refusé côté interface, même avec une description
  test.each([[""], ["   "]])("refuse le titre %j sans appeler l'action", async (title) => {
    render(<CreateCardForm />);
    open();

    fill(title, "Une description");
    submit();

    expect(await screen.findByText("Le titre est obligatoire.")).toBeDefined();
    expect(createCardAction).not.toHaveBeenCalled();
  });

  // Lot 1, critère 5 : échec signalé, la saisie est gardée
  test("signale l'échec d'enregistrement et garde le titre et la description", async () => {
    createCardAction.mockResolvedValue({ ok: false, error: "save_failed" });
    render(<CreateCardForm />);
    open();

    fill("Brancher Turso", "Détails");
    submit();

    expect((await screen.findByRole("alert")).textContent).toContain("Échec de l’enregistrement");
    expect(titleField().value).toBe("Brancher Turso");
    expect(descriptionField().value).toBe("Détails");
  });

  // Issue #19 : « Annuler » puis « Ajouter » à l'extrême droite, comme d'habitude
  test("place « Annuler » avant « Ajouter », en fin de rangée à droite", () => {
    render(<CreateCardForm />);
    open();

    const row = screen.getByRole("button", { name: "Ajouter" }).parentElement!;
    expect([...row.querySelectorAll("button")].map((button) => button.textContent)).toEqual(["Annuler", "Ajouter"]);
    expect(row.className).toContain("justify-end");
  });
});
