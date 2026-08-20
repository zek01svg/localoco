import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Stub window.matchMedia for responsive components and hooks
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn<(_query: string) => MediaQueryList>().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn<() => void>(),
    removeListener: vi.fn<() => void>(),
    addEventListener:
      vi.fn<(_type: string, _listener: EventListenerOrEventListenerObject) => void>(),
    removeEventListener:
      vi.fn<(_type: string, _listener: EventListenerOrEventListenerObject) => void>(),
    dispatchEvent: vi.fn<(_event: Event) => boolean>().mockReturnValue(true),
  })),
});

// Stub ResizeObserver for layout components
class MockResizeObserver {
  observe = vi.fn<() => void>();
  unobserve = vi.fn<() => void>();
  disconnect = vi.fn<() => void>();
}
globalThis.ResizeObserver = MockResizeObserver;

// Stub window.scrollTo to prevent JSDOM warnings
Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: vi.fn<() => void>(),
});

// Radix Avatar in jsdom never renders its <img>: AvatarImage mounts the <img>
// only after window.Image reports loaded (complete && naturalWidth > 0), and jsdom
// never fires load events (Lesson 7). Stub window.Image with complete: true,
// naturalWidth: 1, an addEventListener/removeEventListener map, and a src setter
// that fires the "load" listener with { currentTarget: this }.
function createMockImage() {
  const listeners: Record<string, ((event: unknown) => void)[]> = {};
  let imageSrc = "";

  return {
    complete: true,
    naturalWidth: 1,
    naturalHeight: 1,
    width: 1,
    height: 1,
    addEventListener(type: string, listener: (event: unknown) => void) {
      listeners[type] = listeners[type] ?? [];
      listeners[type].push(listener);
    },
    removeEventListener(type: string, listener: (event: unknown) => void) {
      listeners[type] = (listeners[type] ?? []).filter(l => l !== listener);
    },
    dispatchEvent(event: { type: string }) {
      const list = listeners[event.type] ?? [];
      for (const l of list) {
        l(event);
      }
      return true;
    },
    get src() {
      return imageSrc;
    },
    set src(value: string) {
      imageSrc = value;
      if (value) {
        setTimeout(() => {
          const loadListeners = listeners["load"] ?? [];
          for (const l of loadListeners) {
            l({ currentTarget: this, type: "load" });
          }
        }, 0);
      }
    },
  };
}

// @ts-expect-error Mock Image definition for jsdom
globalThis.Image = vi.fn<() => unknown>().mockImplementation(createMockImage);
