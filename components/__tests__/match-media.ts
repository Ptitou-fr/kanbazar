// matchMedia de test : jsdom ne l'implémente pas. `setDark` simule un
// changement du réglage clair/sombre du système.
export function installMatchMedia(initialDark = false) {
  let dark = initialDark;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  window.matchMedia = ((query: string) => ({
    get matches() {
      return query.includes("prefers-color-scheme: dark") ? dark : false;
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return {
    setDark(value: boolean) {
      dark = value;
      listeners.forEach((listener) => listener({ matches: value } as MediaQueryListEvent));
    },
  };
}
