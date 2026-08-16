import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LandingPage } from "#client/features/landing/landing";

describe("LandingPage", () => {
  it("renders meaningful marketing content, not just a mount point", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Find local gems");
    expect(screen.getByRole("link", { name: "Let\u2019s go!" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Why LocaLoco?" })).toBeTruthy();
    expect(screen.getByText("Support Local")).toBeTruthy();
    expect(screen.getByText("Visit & support")).toBeTruthy();
  });
});
