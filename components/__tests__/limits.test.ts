import { describe, expect, test } from "vitest";
import * as ui from "@/components/board/columns";
import * as service from "@/services/card-service";

describe("limites de taille", () => {
  // Issue #21 : l'interface reprend les limites du service, qui fait autorité.
  test("l'interface et le service ont les mêmes limites", () => {
    expect(ui.TITLE_MAX_LENGTH).toBe(service.TITLE_MAX_LENGTH);
    expect(ui.DESCRIPTION_MAX_LENGTH).toBe(service.DESCRIPTION_MAX_LENGTH);
  });
});
