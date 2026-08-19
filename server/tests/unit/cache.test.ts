import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOrSetCache } from "#server/lib/cache";

const mockGet = vi.fn<(_key: string) => Promise<unknown>>();
const mockSet =
  vi.fn<(_key: string, _value: unknown, _options?: { ex?: number }) => Promise<unknown>>();

vi.mock("#server/lib/redis", () => ({
  redis: {
    get: (key: string) => mockGet(key),
    set: (key: string, value: unknown, options?: { ex?: number }) => mockSet(key, value, options),
  },
}));

describe("getOrSetCache standard operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached data on cache hit without calling fetcher", async () => {
    const cachedData = { id: 1, name: "Cached Listing" };
    mockGet.mockResolvedValueOnce(cachedData);

    const fetcher = vi.fn<() => Promise<{ id: number; name: string }>>().mockResolvedValue({
      id: 1,
      name: "Fresh Listing",
    });

    const result = await getOrSetCache("listings:first:20", 60, fetcher);

    expect(result).toEqual(cachedData);
    expect(mockGet).toHaveBeenCalledWith("listings:first:20");
    expect(fetcher).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("calls fetcher and writes to cache with TTL on cache miss", async () => {
    mockGet.mockResolvedValueOnce(null);
    const freshData = { id: 2, name: "Fresh Listing" };
    const fetcher = vi
      .fn<() => Promise<{ id: number; name: string }>>()
      .mockResolvedValue(freshData);

    const result = await getOrSetCache("listings:first:20", 60, fetcher);

    expect(result).toEqual(freshData);
    expect(mockGet).toHaveBeenCalledWith("listings:first:20");
    expect(fetcher).toHaveBeenCalledOnce();
    expect(mockSet).toHaveBeenCalledWith("listings:first:20", freshData, { ex: 60 });
  });

  it("handles empty items list as a valid cached payload", async () => {
    const emptyPayload = { items: [], nextCursor: null };
    mockGet.mockResolvedValueOnce(emptyPayload);

    const fetcher = vi.fn<() => Promise<{ items: never[]; nextCursor: null }>>();

    const result = await getOrSetCache("listings:empty:20", 60, fetcher);

    expect(result).toEqual(emptyPayload);
    expect(mockGet).toHaveBeenCalledWith("listings:empty:20");
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("getOrSetCache error resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transparently falls back to fetcher when redis.get throws an error", async () => {
    mockGet.mockRejectedValueOnce(new Error("Redis connection refused"));
    const freshData = { id: 3, name: "Fallback Listing" };
    const fetcher = vi
      .fn<() => Promise<{ id: number; name: string }>>()
      .mockResolvedValue(freshData);

    const result = await getOrSetCache("listings:first:20", 60, fetcher);

    expect(result).toEqual(freshData);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(mockSet).toHaveBeenCalledWith("listings:first:20", freshData, { ex: 60 });
  });

  it("returns fresh data even if redis.set throws an error", async () => {
    mockGet.mockResolvedValueOnce(null);
    mockSet.mockRejectedValueOnce(new Error("Redis set write timeout"));
    const freshData = { id: 4, name: "Listing Despite Set Error" };
    const fetcher = vi
      .fn<() => Promise<{ id: number; name: string }>>()
      .mockResolvedValue(freshData);

    const result = await getOrSetCache("listings:first:20", 60, fetcher);

    expect(result).toEqual(freshData);
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
