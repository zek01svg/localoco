import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StarRating } from "#client/components/star-rating";
import { StarRatingInput } from "#client/components/star-rating-input";

describe("StarRating component", () => {
  afterEach(cleanup);

  it("renders 'No reviews yet' when rating is null", () => {
    render(<StarRating rating={null} />);
    expect(screen.getByText("No reviews yet")).toBeDefined();
  });

  it("renders star rating with score and count", () => {
    render(<StarRating rating={4.5} totalCount={12} showScore showCount />);
    expect(screen.getByText("4.5")).toBeDefined();
    expect(screen.getByText("(12)")).toBeDefined();
    expect(screen.getByLabelText("4.5 out of 5 stars from 12 reviews")).toBeDefined();
  });
});

describe("StarRatingInput component", () => {
  afterEach(cleanup);

  it("renders 5 radio buttons for stars 1 to 5", () => {
    render(<StarRatingInput value={3} onChange={() => {}} />);
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBe(5);
    expect(radios[2].matches(":checked")).toBe(true);
    expect(radios[0].matches(":checked")).toBe(false);
  });

  it("calls onChange when a star is clicked", () => {
    const handleChange = vi.fn<(_rating: number) => void>();
    render(<StarRatingInput value={0} onChange={handleChange} />);
    const radios = screen.getAllByRole("radio");
    // Click 5th star
    fireEvent.click(radios[4]);
    expect(handleChange).toHaveBeenCalledWith(5);
  });

  it("supports keyboard navigation with arrow keys", () => {
    const handleChange = vi.fn<(_rating: number) => void>();
    render(<StarRatingInput value={3} onChange={handleChange} />);
    const radios = screen.getAllByRole("radio");
    fireEvent.keyDown(radios[2], { key: "ArrowRight" });
    expect(handleChange).toHaveBeenCalledWith(4);

    fireEvent.keyDown(radios[2], { key: "ArrowLeft" });
    expect(handleChange).toHaveBeenCalledWith(2);
  });

  it("clamps arrow navigation at 1 and 5", () => {
    const handleChange = vi.fn<(_rating: number) => void>();
    render(<StarRatingInput value={5} onChange={handleChange} />);
    const radios = screen.getAllByRole("radio");
    fireEvent.keyDown(radios[4], { key: "ArrowRight" });
    expect(handleChange).toHaveBeenCalledWith(5);

    fireEvent.keyDown(radios[0], { key: "ArrowLeft" });
    expect(handleChange).toHaveBeenCalledWith(1);
  });

  it("disables interaction when disabled prop is true", () => {
    const handleChange = vi.fn<(_rating: number) => void>();
    render(<StarRatingInput value={3} onChange={handleChange} disabled />);
    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[4]);
    expect(handleChange).not.toHaveBeenCalled();
  });
});
