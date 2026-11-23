import { beforeEach, describe, expect, test, vi } from "vitest";

const { createCard, refresh } = vi.hoisted(() => ({ createCard: vi.fn(), refresh: vi.fn() }));
vi.mock("@/services/card-service", () => ({ cardService: { createCard } }));
vi.mock("next/cache", () => ({ refresh }));

import { createCardAction } from "@/app/actions/create-card";

function formWith(title: string, description?: string) {
  const data = new FormData();
  data.set("title", title);
  if (description !== undefined) data.set("description", description);
  return data;
}

describe("createCardAction", () => {
  beforeEach(() => {
    createCard.mockReset();
    refresh.mockReset();
  });

  // Critère 2 : succès, le tableau est rafraîchi
  test("transmet le titre au service et rafraîchit le tableau", async () => {
    createCard.mockResolvedValue({ ok: true, card: { id: "1", title: "T", status: "todo", position: 1 } });

    await expect(createCardAction(formWith("T"))).resolves.toEqual({ ok: true });
    expect(createCard).toHaveBeenCalledWith("T", null);
    expect(refresh).toHaveBeenCalledOnce();
  });

  // Critère 3 : refus côté service relayé tel quel
  test("relaie le refus d'un titre vide sans rafraîchir", async () => {
    createCard.mockResolvedValue({ ok: false, error: "title_required" });

    await expect(createCardAction(formWith(" "))).resolves.toEqual({ ok: false, error: "title_required" });
    expect(refresh).not.toHaveBeenCalled();
  });

  // Critère 5 : base injoignable
  test("signale un échec d'enregistrement quand le service échoue", async () => {
    createCard.mockRejectedValue(new Error("base injoignable"));

    await expect(createCardAction(formWith("T"))).resolves.toEqual({ ok: false, error: "save_failed" });
    expect(refresh).not.toHaveBeenCalled();
  });

  // Issue #17 : la description du formulaire est transmise au service
  test("transmet la description saisie au service", async () => {
    createCard.mockResolvedValue({ ok: true, card: { id: "1", title: "T", description: "D", status: "todo", position: 1 } });

    await expect(createCardAction(formWith("T", "D"))).resolves.toEqual({ ok: true });
    expect(createCard).toHaveBeenCalledWith("T", "D");
  });
});
