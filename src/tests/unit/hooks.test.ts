import { act, cleanup, renderHook } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCopyToClipboard } from "#client/hooks/use-copy-to-clipboard";
import { useDebounce } from "#client/hooks/use-debounce";
import { useHotKey } from "#client/hooks/use-hot-key";
import { useMediaQuery } from "#client/hooks/use-media-query";
import { useIsMobile } from "#client/hooks/use-mobile";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn<(_msg: string) => void>(),
    error: vi.fn<(_msg: string) => void>(),
  },
}));

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("updates debounced value only after the delay has elapsed", () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: "first", delay: 300 },
    });

    expect(result.current).toBe("first");

    rerender({ value: "second", delay: 300 });
    expect(result.current).toBe("first");

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("first");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("second");
  });

  it("cancels pending timer when value updates rapidly", () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: "a", delay: 300 },
    });

    rerender({ value: "b", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    rerender({ value: "c", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe("c");
  });
});

describe("useCopyToClipboard", () => {
  let writeTextMock: ReturnType<typeof vi.fn<(_text: string) => Promise<void>>>;

  beforeEach(() => {
    vi.useFakeTimers();
    writeTextMock = vi.fn<(_text: string) => Promise<void>>().mockResolvedValue();
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("writes text to clipboard and manages isCopied state with auto-reset", async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    expect(result.current.text).toBeNull();
    expect(result.current.isCopied).toBe(false);

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.copy("Hello World", { timeout: 1000, withToast: true });
    });

    expect(success).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith("Hello World");
    expect(result.current.text).toBe("Hello World");
    expect(result.current.isCopied).toBe(true);
    expect(toast.success).toHaveBeenCalledWith("Copied to clipboard");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.text).toBeNull();
    expect(result.current.isCopied).toBe(false);
  });

  it("handles clipboard failure gracefully returning false", async () => {
    writeTextMock.mockRejectedValueOnce(new Error("Clipboard permission denied"));

    const { result } = renderHook(() => useCopyToClipboard());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.copy("Failed Text");
    });

    expect(success).toBe(false);
    expect(result.current.text).toBeNull();
    expect(result.current.isCopied).toBe(false);
  });
});

describe("useHotKey", () => {
  afterEach(cleanup);

  it("triggers callback when target key with Meta or Ctrl modifier is pressed", () => {
    const callback = vi.fn<() => void>();
    renderHook(() => {
      useHotKey(() => {
        callback();
      }, "k");
    });

    // Key without modifier - should not trigger
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
    expect(callback).not.toHaveBeenCalled();

    // Wrong key with modifier - should not trigger
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "j", metaKey: true }));
    expect(callback).not.toHaveBeenCalled();

    // Matching key with metaKey - triggers
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    expect(callback).toHaveBeenCalledTimes(1);

    // Matching key with ctrlKey - triggers
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("removes event listener upon unmount", () => {
    const callback = vi.fn<() => void>();
    const { unmount } = renderHook(() => {
      useHotKey(() => {
        callback();
      }, "k");
    });

    unmount();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    expect(callback).not.toHaveBeenCalled();
  });
});

describe("useMediaQuery", () => {
  let changeListeners: ((event: Event) => void)[] = [];

  beforeEach(() => {
    changeListeners = [];
    window.matchMedia = vi
      .fn<(_query: string) => MediaQueryList>()
      .mockImplementation((query: string) => ({
        matches: query.includes("min-width: 1024px"),
        media: query,
        onchange: null,
        addListener: vi.fn<() => void>(),
        removeListener: vi.fn<() => void>(),
        addEventListener: vi.fn<
          (_type: string, _listener: EventListenerOrEventListenerObject) => void
        >((type: string, listener: EventListenerOrEventListenerObject) => {
          if (type === "change" && typeof listener === "function") {
            changeListeners.push(event => {
              listener(event);
            });
          }
        }),
        removeEventListener: vi.fn<
          (_type: string, _listener: EventListenerOrEventListenerObject) => void
        >((_type: string, listener: EventListenerOrEventListenerObject) => {
          changeListeners = changeListeners.filter(l => l !== listener);
        }),
        dispatchEvent: vi.fn<() => boolean>(),
      }));
  });

  afterEach(cleanup);

  it("returns match state for the query and subscribes to change events", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));
    expect(result.current).toBe(true);

    act(() => {
      const mockEvent = new Event("change");
      Object.defineProperty(mockEvent, "matches", { value: false });
      for (const listener of changeListeners) {
        listener(mockEvent);
      }
    });

    expect(result.current).toBe(false);
  });
});

describe("useIsMobile", () => {
  let changeListeners: (() => void)[] = [];

  beforeEach(() => {
    changeListeners = [];
    window.matchMedia = vi
      .fn<(_query: string) => MediaQueryList>()
      .mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn<() => void>(),
        removeListener: vi.fn<() => void>(),
        addEventListener: vi.fn<
          (_type: string, _listener: EventListenerOrEventListenerObject) => void
        >((type: string, listener: EventListenerOrEventListenerObject) => {
          if (type === "change" && typeof listener === "function") {
            changeListeners.push(() => {
              listener(new Event("change"));
            });
          }
        }),
        removeEventListener: vi.fn<
          (_type: string, _listener: EventListenerOrEventListenerObject) => void
        >((_type: string, listener: EventListenerOrEventListenerObject) => {
          changeListeners = changeListeners.filter(l => l !== listener);
        }),
        dispatchEvent: vi.fn<() => boolean>(),
      }));
  });

  afterEach(cleanup);

  it("returns true when innerWidth is below 768px and reacts to viewport changes", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 500 });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });
      for (const listener of changeListeners) {
        listener();
      }
    });

    expect(result.current).toBe(false);
  });
});
