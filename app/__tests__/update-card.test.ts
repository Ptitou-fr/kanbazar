import { beforeEach, describe, expect, test, vi } from "vitest";

const { updateCard, refresh } = vi.hoisted(() => ({ updateCard: vi.fn(), refresh: vi.fn() }));
vi.mock("@/services/card-service", () => ({ cardService: { updateCard } }));
vi.mock("next/cache", () => ({ refresh }));

import { updateCardAction } from "@/app/actions/update-card";

const saved = { id: "a", title: "Nouveau", description: "", status: "todo", position: 1 };

describe("updateCardAction", () => {
  beforeEach(() => {
    updateCard.mockReset();
    refresh.mockReset();
  });

  // Lot 2, critères 1 et 2 : modification transmise, tableau rafraîchi
  test("transmet la modification au service, renvoie la carte et rafraîchit le tableau", async () => {
    updateCard.mockResolvedValue({ ok: true, card: saved });

    await expect(updateCardAction("a", { title: "Nouveau" })).resolves.toEqual({ ok: true, card: saved });
    expect(updateCard).toHaveBeenCalledWith("a", { title: "Nouveau" });
    expect(refresh).toHaveBeenCalledOnce();
  });

  // Lot 2, critère 3 : refus relayé sans rafraîchir
  test("relaie le refus d'un titre vide", async () => {
    updateCard.mockResolvedValue({ ok: false, error: "title_required" });

    await expect(updateCardAction("a", { title: "" })).resolves.toEqual({ ok: false, error: "title_required" });
    expect(refresh).not.toHaveBeenCalled();
  });

  test("rafraîchit le tableau quand la carte n'existe plus", async () => {
    updateCard.mockResolvedValue({ ok: false, error: "not_found" });

    await expect(updateCardAction("a", { title: "X" })).resolves.toEqual({ ok: false, error: "not_found" });
    expect(refresh).toHaveBeenCalledOnce();
  });

  // Lot 2, critère 4 : échec d'enregistrement
  test("signale un échec d'enregistrement quand le service échoue", async () => {
    updateCard.mockRejectedValue(new Error("base injoignable"));

    await expect(updateCardAction("a", { title: "X" })).resolves.toEqual({ ok: false, error: "save_failed" });
    expect(refresh).not.toHaveBeenCalled();
  });
});
