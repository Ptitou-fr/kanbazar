import { vi } from "vitest";

// « server-only » lève une erreur hors de la condition react-server de Next.
vi.mock("server-only", () => ({}));
