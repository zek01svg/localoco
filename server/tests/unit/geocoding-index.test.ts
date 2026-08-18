import { describe, expect, it, vi } from "vitest";

// The app-wide seam must fail explicitly when the credential is missing:
// address validation never degrades into silently unvalidated addresses.
// env is snapshotted at import, so the module is re-imported after stubbing.
describe("geocoding app seam - missing credential", () => {
  it("throws a classified provider_unavailable error when no key is configured", async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");

    const { geocodeAddress } = await import("#server/lib/geocoding");
    await expect(
      geocodeAddress({ address: "1 Boon Lay Drive", postalCode: "640001" })
    ).rejects.toMatchObject({ name: "GeocodeError", kind: "provider_unavailable" });
  });
});
